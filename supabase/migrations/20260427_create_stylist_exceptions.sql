-- Migration: Create stylist_exceptions table
-- Purpose: Store exception days/times when stylists are not available
-- Example use cases:
--   - Day off (leave, sick day)
--   - Blocked time slot (urgent work, meeting)
--   - Custom working hours for a specific date

BEGIN;

-- Create the stylist_exceptions table
CREATE TABLE IF NOT EXISTS stylist_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    start_time TIME, -- null = from start of day
    end_time TIME,   -- null = until end of day
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate exceptions for same stylist on same date with same time range
    CONSTRAINT unique_stylist_date_time_range UNIQUE (stylist_id, exception_date, start_time, end_time)
);

-- Index for fast lookups when checking availability
CREATE INDEX IF NOT EXISTS idx_stylist_exceptions_stylist_date
ON stylist_exceptions(stylist_id, exception_date);

-- Index for finding all exceptions in a date range
CREATE INDEX IF NOT EXISTS idx_stylist_exceptions_date_range
ON stylist_exceptions(exception_date);

-- Add check constraint: if both start_time and end_time are set, end_time must be after start_time
ALTER TABLE stylist_exceptions
ADD CONSTRAINT check_time_order
CHECK (
    (start_time IS NULL AND end_time IS NULL) OR
    (start_time IS NOT NULL AND end_time IS NULL) OR
    (start_time IS NULL AND end_time IS NOT NULL) OR
    (start_time < end_time)
);

-- Comments for documentation
COMMENT ON TABLE stylist_exceptions IS 'Exception days/hours when stylists are unavailable';
COMMENT ON COLUMN stylist_exceptions.exception_date IS 'The specific date of the exception';
COMMENT ON COLUMN stylist_exceptions.start_time IS 'Block starts at this time (null = start of day)';
COMMENT ON COLUMN stylist_exceptions.end_time IS 'Block ends at this time (null = end of day)';
COMMENT ON COLUMN stylist_exceptions.reason IS 'Optional reason (e.g., Leave, Urgent work, Meeting)';

COMMIT;

-- ============================================================
-- Helper function: get_stylist_exceptions_for_date
-- Returns all exceptions for a stylist on a specific date
-- ============================================================
CREATE OR REPLACE FUNCTION get_stylist_exceptions_for_date(
    p_stylist_id UUID,
    p_date DATE
)
RETURNS TABLE (
    id UUID,
    exception_date DATE,
    start_time TIME,
    end_time TIME,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.id,
        se.exception_date,
        se.start_time,
        se.end_time,
        se.reason
    FROM stylist_exceptions se
    WHERE se.stylist_id = p_stylist_id
      AND se.exception_date = p_date;
END;
$$;

-- ============================================================
-- Helper function: is_stylist_available_at
-- Checks if a stylist is available at a specific datetime
-- Returns true if available, false if blocked
-- ============================================================
CREATE OR REPLACE FUNCTION is_stylist_available_at(
    p_stylist_id UUID,
    p_datetime TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_date DATE;
    v_time TIME;
    v_exception_count INT;
BEGIN
    -- Extract date and time from the datetime
    v_date := DATE(p_datetime);
    v_time := TIME(p_datetime);

    -- Check if there's an exception covering this time
    SELECT COUNT(*)
    INTO v_exception_count
    FROM stylist_exceptions se
    WHERE se.stylist_id = p_stylist_id
      AND se.exception_date = v_date
      AND (
          -- Case 1: Full day exception (both null)
          (se.start_time IS NULL AND se.end_time IS NULL)
          OR
          -- Case 2: Only start_time set (from start_time to end of day)
          (se.start_time IS NOT NULL AND se.end_time IS NULL AND v_time >= se.start_time)
          OR
          -- Case 3: Only end_time set (from start of day to end_time)
          (se.start_time IS NULL AND se.end_time IS NOT NULL AND v_time <= se.end_time)
          OR
          -- Case 4: Both set (from start_time to end_time)
          (se.start_time IS NOT NULL AND se.end_time IS NOT NULL
           AND v_time >= se.start_time AND v_time <= se.end_time)
      );

    -- If any exception covers this time, stylist is NOT available
    RETURN v_exception_count = 0;
END;
$$;

-- ============================================================
-- Updated function: get_available_slots
-- Now checks stylist_exceptions table
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_slots(
    p_stylist_id UUID,
    p_date DATE,
    p_duration_minutes INT DEFAULT 30
)
RETURNS TABLE (slot_time TIME)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_work_start TIME;
    v_work_end TIME;
    v_dow INT;
    v_slot_interval INT := 15; -- 15-minute intervals
    v_current_slot TIME;
    v_slot_end TIME;
BEGIN
    -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    v_dow := EXTRACT(DOW FROM p_date)::INT;

    -- Get working hours for this stylist on this day
    SELECT wh.start_time, wh.end_time
    INTO v_work_start, v_work_end
    FROM working_hours wh
    WHERE wh.stylist_id = p_stylist_id
      AND wh.day_of_week = v_dow;

    -- If no working hours defined, return empty
    IF v_work_start IS NULL OR v_work_end IS NULL THEN
        RETURN;
    END IF;

    -- Check if stylist has full-day exception on this date
    IF EXISTS (
        SELECT 1
        FROM stylist_exceptions se
        WHERE se.stylist_id = p_stylist_id
          AND se.exception_date = p_date
          AND se.start_time IS NULL
          AND se.end_time IS NULL
    ) THEN
        RETURN; -- Full day off
    END IF;

    -- Initialize slot counter
    v_current_slot := v_work_start;

    -- Generate slots at interval
    WHILE TRUE LOOP
        -- Calculate slot end time
        v_slot_end := v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL;

        -- Check if slot fits within working hours
        IF v_slot_end > (v_work_end || ':00')::TIME THEN
            EXIT; -- No more slots fit
        END IF;

        -- Check if slot conflicts with any exception
        IF NOT EXISTS (
            SELECT 1
            FROM stylist_exceptions se
            WHERE se.stylist_id = p_stylist_id
              AND se.exception_date = p_date
              AND (
                  -- Slot starts during an exception
                  (se.start_time IS NOT NULL AND se.end_time IS NOT NULL
                   AND v_current_slot >= se.start_time AND v_current_slot < se.end_time)
                  OR
                  -- Slot ends during an exception
                  (se.start_time IS NOT NULL AND se.end_time IS NOT NULL
                   AND v_slot_end > se.start_time AND v_slot_end <= se.end_time)
                  OR
                  -- Exception is start-of-day to some time, slot overlaps
                  (se.start_time IS NULL AND se.end_time IS NOT NULL
                   AND v_current_slot < se.end_time AND v_slot_end > se.end_time)
                  OR
                  -- Exception is some time to end-of-day, slot overlaps
                  (se.start_time IS NOT NULL AND se.end_time IS NULL
                   AND v_current_slot >= se.start_time)
              )
        )
        AND
        -- Check if slot conflicts with existing bookings
        NOT EXISTS (
            SELECT 1
            FROM bookings b
            WHERE b.stylist_id = p_stylist_id
              AND b.booking_date = p_date::TEXT
              AND b.status NOT IN ('cancelled')
              AND (
                  -- New slot starts during existing booking
                  (v_current_slot >= b.start_time::TIME AND v_current_slot < b.end_time::TIME)
                  OR
                  -- New slot ends during existing booking
                  (v_slot_end > b.start_time::TIME AND v_slot_end <= b.end_time::TIME)
                  OR
                  -- New slot completely contains existing booking
                  (v_current_slot <= b.start_time::TIME AND v_slot_end >= b.end_time::TIME)
              )
        )
        THEN
            -- Slot is available
            slot_time := v_current_slot;
            RETURN NEXT;
        END IF;

        -- Move to next slot
        v_current_slot := v_current_slot + (v_slot_interval || ' minutes')::INTERVAL;
    END LOOP;
END;
$$;

-- ============================================================
-- Updated RPC: get_available_slots_json
-- Returns JSON array with slot info for frontend
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_slots_json(
    p_stylist_id UUID,
    p_date DATE,
    p_duration_minutes INT DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_slots JSON;
BEGIN
    SELECT COALESCE(json_agg(slot_time::TEXT), '[]')
    INTO v_slots
    FROM get_available_slots(p_stylist_id, p_date, p_duration_minutes);

    RETURN v_slots;
END;
$$;
