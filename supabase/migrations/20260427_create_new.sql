-- =============================================================================
-- CREATE: Build complete booking system
-- Run THIS FILE SECOND (after cleanup)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CREATE STYLIST_EXCEPTIONS TABLE
-- =============================================================================

CREATE TABLE stylist_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    start_time TIME,  -- NULL = full day off, NOT NULL = partial block
    end_time TIME,    -- NULL = full day off, NOT NULL = partial block
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_date CHECK (exception_date >= CURRENT_DATE),
    CONSTRAINT valid_time_range CHECK (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    )
);

-- Indexes for fast lookups
CREATE INDEX idx_stylist_exceptions_stylist_date ON stylist_exceptions(stylist_id, exception_date);
CREATE INDEX idx_stylist_exceptions_date ON stylist_exceptions(exception_date);

COMMENT ON TABLE stylist_exceptions IS 'Days off or blocked time ranges for stylists';

-- =============================================================================
-- 2. ENABLE RLS ON STYLIST_EXCEPTIONS
-- =============================================================================

ALTER TABLE stylist_exceptions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view exceptions (for checking availability)
CREATE POLICY "Public can view stylist exceptions"
ON stylist_exceptions
FOR SELECT
USING (true);

-- Policy: Authenticated users can insert exceptions
CREATE POLICY "Authenticated users can insert exceptions"
ON stylist_exceptions
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update exceptions
CREATE POLICY "Authenticated users can update exceptions"
ON stylist_exceptions
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete exceptions
CREATE POLICY "Authenticated users can delete exceptions"
ON stylist_exceptions
FOR DELETE
USING (auth.role() = 'authenticated');

-- =============================================================================
-- 3. CREATE HELPER FUNCTIONS
-- =============================================================================

-- Get all exceptions for a stylist
CREATE OR REPLACE FUNCTION get_stylist_exceptions(p_stylist_id UUID)
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
    SELECT se.id, se.exception_date, se.start_time, se.end_time, se.reason
    FROM stylist_exceptions se
    WHERE se.stylist_id = p_stylist_id
    ORDER BY se.exception_date;
END;
$$;

-- Check if stylist is available at a specific datetime
CREATE OR REPLACE FUNCTION is_stylist_available_at(
    p_stylist_id UUID,
    p_datetime TIMESTAMP
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dow INT;
    v_has_working_hours BOOLEAN;
    v_is_full_day_off BOOLEAN;
    v_has_conflicting_booking BOOLEAN;
    v_has_partial_exception BOOLEAN;
    v_slot_time TIME;
BEGIN
    -- Get day of week (0=Sunday)
    v_dow := EXTRACT(DOW FROM p_datetime)::INT;
    v_slot_time := p_datetime::TIME;
    
    -- Check 1: Stylist has working hours for this day?
    SELECT EXISTS (
        SELECT 1 FROM working_hours 
        WHERE stylist_id = p_stylist_id AND day_of_week = v_dow
    ) INTO v_has_working_hours;
    
    IF NOT v_has_working_hours THEN
        RETURN FALSE;
    END IF;
    
    -- Check 2: Is it a full-day exception?
    SELECT EXISTS (
        SELECT 1 FROM stylist_exceptions
        WHERE stylist_id = p_stylist_id
          AND exception_date = p_datetime::DATE
          AND start_time IS NULL
          AND end_time IS NULL
    ) INTO v_is_full_day_off;
    
    IF v_is_full_day_off THEN
        RETURN FALSE;
    END IF;
    
    -- Check 3: Is there a partial exception covering this time?
    SELECT EXISTS (
        SELECT 1 FROM stylist_exceptions
        WHERE stylist_id = p_stylist_id
          AND exception_date = p_datetime::DATE
          AND start_time IS NOT NULL
          AND end_time IS NOT NULL
          AND v_slot_time >= start_time
          AND v_slot_time < end_time
    ) INTO v_has_partial_exception;
    
    IF v_has_partial_exception THEN
        RETURN FALSE;
    END IF;
    
    -- Check 4: Is there a conflicting booking?
    SELECT EXISTS (
        SELECT 1 FROM bookings
        WHERE stylist_id = p_stylist_id
          AND booking_date = p_datetime::DATE
          AND status NOT IN ('cancelled')
          AND (
              (start_time <= v_slot_time AND end_time > v_slot_time) OR
              (start_time < v_slot_time + INTERVAL '1 minute' AND end_time > v_slot_time)
          )
    ) INTO v_has_conflicting_booking;
    
    IF v_has_conflicting_booking THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Get exceptions for a specific date
CREATE OR REPLACE FUNCTION get_stylist_exceptions_for_date(
    p_stylist_id UUID,
    p_date DATE
)
RETURNS TABLE (
    id UUID,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    is_full_day BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        se.id,
        se.start_time,
        se.end_time,
        se.reason,
        (se.start_time IS NULL AND se.end_time IS NULL)::BOOLEAN as is_full_day
    FROM stylist_exceptions se
    WHERE se.stylist_id = p_stylist_id
      AND se.exception_date = p_date
    ORDER BY se.start_time NULLS FIRST;
END;
$$;

-- =============================================================================
-- 4. CREATE MAIN SLOT CALCULATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_available_slots(
    p_stylist_id UUID,
    p_date DATE,
    p_duration_minutes INTEGER
)
RETURNS TABLE (slot_time TIME)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_work_start TIME;
    v_work_end TIME;
    v_dow INT;
    v_is_full_day_off BOOLEAN;
    v_slot_start TIME;
    v_slot_end TIMESTAMP;
    v_has_exception BOOLEAN;
    v_has_booking BOOLEAN;
    v_current_time TIME;
BEGIN
    -- Get current time for today comparison
    v_current_time := (NOW() AT TIME ZONE 'Europe/Bratislava')::TIME;
    
    -- Get day of week (0=Sunday)
    v_dow := EXTRACT(DOW FROM p_date)::INT;
    
    -- Check if stylist has working hours for this day
    SELECT wh.start_time, wh.end_time
    INTO v_work_start, v_work_end
    FROM working_hours wh
    WHERE wh.stylist_id = p_stylist_id
      AND wh.day_of_week = v_dow;
    
    -- If no working hours defined, return empty
    IF v_work_start IS NULL OR v_work_end IS NULL THEN
        RETURN;
    END IF;
    
    -- Check if it's a full-day exception
    SELECT EXISTS (
        SELECT 1 FROM stylist_exceptions
        WHERE stylist_id = p_stylist_id
          AND exception_date = p_date
          AND start_time IS NULL
          AND end_time IS NULL
    ) INTO v_is_full_day_off;
    
    IF v_is_full_day_off THEN
        RETURN;
    END IF;
    
    -- Start generating slots from beginning of working hours
    v_slot_start := v_work_start;
    
    -- If booking for today, start from next available slot (15 min from now)
    IF p_date = CURRENT_DATE AND v_slot_start < v_current_time + INTERVAL '30 minutes' THEN
        -- Round up to next 15-minute interval
        v_slot_start := v_current_time + INTERVAL '30 minutes';
        v_slot_start := DATE_TRUNC('minute', v_slot_start) + 
                       (FLOOR(EXTRACT(MINUTE FROM v_slot_start)::INTEGER / 15) * INTERVAL '30 minutes');
    END IF;
    
    -- Generate slots at 15-minute intervals
    WHILE TRUE LOOP
        -- Check if slot fits within working hours
        v_slot_end := p_date::TIMESTAMP + v_slot_start + (p_duration_minutes || ' minutes')::INTERVAL;
        
        IF v_slot_end::TIME > v_work_end THEN
            EXIT; -- No more slots fit
        END IF;
        
        -- Check if slot conflicts with any exception
        SELECT EXISTS (
            SELECT 1 FROM stylist_exceptions
            WHERE stylist_id = p_stylist_id
              AND exception_date = p_date
              AND start_time IS NOT NULL
              AND end_time IS NOT NULL
              AND (
                  -- Slot overlaps with exception
                  (v_slot_start < end_time AND v_slot_end::TIME > start_time)
              )
        ) INTO v_has_exception;
        
        IF v_has_exception THEN
            -- Move to next 15-minute slot
            v_slot_start := v_slot_start + INTERVAL '30 minutes';
            CONTINUE;
        END IF;
        
        -- Check if slot conflicts with existing booking
        SELECT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.stylist_id = p_stylist_id
              AND b.booking_date = p_date
              AND b.status NOT IN ('cancelled')
              AND (
                  -- Overlap check: new slot starts during existing booking
                  (v_slot_start >= b.start_time AND v_slot_start < b.end_time) OR
                  -- Or new slot ends during existing booking
                  (v_slot_end::TIME > b.start_time AND v_slot_end::TIME <= b.end_time) OR
                  -- Or new slot completely contains existing booking
                  (v_slot_start <= b.start_time AND v_slot_end::TIME >= b.end_time)
              )
        ) INTO v_has_booking;
        
        IF NOT v_has_booking THEN
            -- Slot is available, return it
            slot_time := v_slot_start;
            RETURN NEXT;
        END IF;
        
        -- Move to next 15-minute slot
        v_slot_start := v_slot_start + INTERVAL '30 minutes';
    END LOOP;
END;
$$;

-- =============================================================================
-- 5. CREATE JSON WRAPPER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_available_slots_json(
    p_stylist_id UUID,
    p_date DATE,
    p_duration_minutes INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(slot_time ORDER BY slot_time), '[]'::JSON)
        FROM get_available_slots(p_stylist_id, p_date, p_duration_minutes)
    );
END;
$$;

-- =============================================================================
-- 6. CREATE EXCEPTION MANAGEMENT FUNCTIONS
-- =============================================================================

-- Create full-day exception (day off)
CREATE OR REPLACE FUNCTION create_stylist_exception(
    p_stylist_id UUID,
    p_exception_date DATE,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exception_id UUID;
BEGIN
    INSERT INTO stylist_exceptions (stylist_id, exception_date, reason)
    VALUES (p_stylist_id, p_exception_date, p_reason)
    RETURNING id INTO v_exception_id;
    
    RETURN v_exception_id;
END;
$$;

-- Create partial exception (blocked time range)
CREATE OR REPLACE FUNCTION create_stylist_exception_partial(
    p_stylist_id UUID,
    p_exception_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exception_id UUID;
BEGIN
    -- Validate time range
    IF p_start_time >= p_end_time THEN
        RAISE EXCEPTION 'Start time must be before end time';
    END IF;
    
    INSERT INTO stylist_exceptions (stylist_id, exception_date, start_time, end_time, reason)
    VALUES (p_stylist_id, p_exception_date, p_start_time, p_end_time, p_reason)
    RETURNING id INTO v_exception_id;
    
    RETURN v_exception_id;
END;
$$;

-- Delete exception
CREATE OR REPLACE FUNCTION delete_stylist_exception(p_exception_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM stylist_exceptions WHERE id = p_exception_id;
    RETURN FOUND;
END;
$$;

COMMIT;

-- =============================================================================
-- 7. TEST QUERIES (run these to verify)
-- =============================================================================

-- Test 1: Check working hours exist
-- SELECT * FROM working_hours WHERE stylist_id = 'YOUR_STYLIST_ID';

-- Test 2: Test slot generation
-- SELECT * FROM get_available_slots('YOUR_STYLIST_ID', CURRENT_DATE + 1, 30);

-- Test 3: Test JSON output
-- SELECT get_available_slots_json('YOUR_STYLIST_ID', CURRENT_DATE + 1, 30);

-- Test 4: Create a full-day exception
-- SELECT create_stylist_exception('YOUR_STYLIST_ID', CURRENT_DATE + 7, 'Vacation');

-- Test 5: Create a partial exception
-- SELECT create_stylist_exception_partial('YOUR_STYLIST_ID', CURRENT_DATE + 3, '12:00', '14:00', 'Lunch break');

-- Test 6: Check if slot is available
-- SELECT is_stylist_available_at('YOUR_STYLIST_ID', CURRENT_DATE + 1 || ' 10:00:00'::TIMESTAMP);
