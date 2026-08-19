-- =============================================================================
-- ADD: Stylist custom work hours + Salon schedule
-- Set once → applies forever unless cleared or changed
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ADD COLUMNS TO STYLISTS (only if stylists table exists)
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stylists') THEN
        ALTER TABLE stylists
          ADD COLUMN IF NOT EXISTS custom_work_start TIME,
          ADD COLUMN IF NOT EXISTS custom_work_end   TIME;
    ELSE
        RAISE NOTICE 'Table stylists does not exist yet — skipping column additions.';
    END IF;
END
$$;

-- =============================================================================
-- 2. CREATE SALON SCHEDULE TABLE
-- Global default hours for the whole shop (used when stylist has no custom hours)
-- =============================================================================

CREATE TABLE IF NOT EXISTS salon_schedule (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6),
    -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_salon_range CHECK (start_time < end_time)
);

COMMENT ON TABLE salon_schedule IS 'Default opening hours of the whole salon per day of week';

-- Seed default salon hours (matches lib/default-working-hours.ts)
INSERT INTO salon_schedule (day_of_week, start_time, end_time, is_active)
VALUES
    (0, '10:00', '17:00', true),  -- Sunday
    (1, '09:00', '19:00', true),  -- Monday
    (2, '09:00', '19:00', true),  -- Tuesday
    (3, '09:00', '19:00', true),  -- Wednesday
    (4, '09:00', '19:00', true),  -- Thursday
    (5, '09:00', '19:00', true),  -- Friday
    (6, '09:00', '18:00', true)   -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;

-- =============================================================================
-- 3. HELPER FUNCTION: resolve effective hours for a stylist on a given date
-- Priority: stylist custom hours > salon_schedule
-- =============================================================================

CREATE OR REPLACE FUNCTION get_stylist_schedule_for_date(
    p_stylist_id UUID,
    p_date        DATE
)
RETURNS TABLE (
    start_time TIME,
    end_time   TIME,
    source     TEXT  -- 'custom' | 'salon'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dow           INTEGER;
    v_custom_start  TIME;
    v_custom_end    TIME;
    v_salon_start   TIME;
    v_salon_end     TIME;
BEGIN
    v_dow := EXTRACT(DOW FROM p_date)::INTEGER;

    -- 1. Check if stylist has custom hours set
    SELECT s.custom_work_start, s.custom_work_end
    INTO  v_custom_start, v_custom_end
    FROM  stylists s
    WHERE s.id = p_stylist_id;

    IF v_custom_start IS NOT NULL AND v_custom_end IS NOT NULL THEN
        -- Custom hours take priority for ALL days
        start_time := v_custom_start;
        end_time   := v_custom_end;
        source     := 'custom';
        RETURN NEXT;
        RETURN;
    END IF;

    -- 2. Fall back to salon schedule
    SELECT ss.start_time, ss.end_time
    INTO  v_salon_start, v_salon_end
    FROM  salon_schedule ss
    WHERE ss.day_of_week = v_dow
      AND ss.is_active   = true;

    IF v_salon_start IS NOT NULL AND v_salon_end IS NOT NULL THEN
        start_time := v_salon_start;
        end_time   := v_salon_end;
        source     := 'salon';
        RETURN NEXT;
    END IF;

    -- No schedule at all → return nothing (0 slots)
END;
$$;

-- =============================================================================
-- 4. UPDATE get_available_slots
-- Replaces the hard-coded working_hours lookup with get_stylist_schedule_for_date
-- =============================================================================

CREATE OR REPLACE FUNCTION get_available_slots(
    p_stylist_id         UUID,
    p_date               DATE,
    p_duration_minutes   INTEGER
)
RETURNS TABLE (slot_time TIME)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_work_start     TIME;
    v_work_end       TIME;
    v_source         TEXT;
    v_slot_start     TIME;
    v_slot_end       TIMESTAMPTZ;
    v_has_exception  BOOLEAN;
    v_has_booking    BOOLEAN;
    v_current_time   TIME;
BEGIN
    -- Current time in Slovakia
    v_current_time := (NOW() AT TIME ZONE 'Europe/Bratislava')::TIME;

    -- Resolve effective schedule (custom hours → salon default)
    SELECT s.start_time, s.end_time, s.source
    INTO  v_work_start, v_work_end, v_source
    FROM  get_stylist_schedule_for_date(p_stylist_id, p_date) s;

    IF v_work_start IS NULL OR v_work_end IS NULL THEN
        RETURN;  -- No schedule for this day
    END IF;

    -- Start from beginning of effective working hours
    v_slot_start := v_work_start;

    -- If booking for today, start from next available slot (60 min from now)
    IF p_date = CURRENT_DATE
       AND v_slot_start < v_current_time + INTERVAL '60 minutes'
    THEN
        v_slot_start := v_current_time + INTERVAL '60 minutes';
        v_slot_start := DATE_TRUNC('minute', v_slot_start)
                      + (FLOOR(EXTRACT(MINUTE FROM v_slot_start)::INTEGER / 30)
                         * INTERVAL '30 minutes');
    END IF;

    -- Generate slots at 30-minute intervals
    LOOP
        v_slot_end := p_date::TIMESTAMP + v_slot_start
                    + (p_duration_minutes || ' minutes')::INTERVAL;

        -- Must fit within working hours
        IF v_slot_end::TIME > v_work_end THEN
            EXIT;
        END IF;

        -- Skip if conflicts with an exception (partial or full-day)
        SELECT EXISTS (
            SELECT 1 FROM stylist_exceptions se
            WHERE  se.stylist_id       = p_stylist_id
              AND  se.exception_date    = p_date
              AND (se.start_time IS NULL  -- full-day off
                   OR                           -- OR
                   v_slot_start < se.end_time  -- slot overlaps partial block
                      AND v_slot_end::TIME > se.start_time)
        ) INTO v_has_exception;

        IF v_has_exception THEN
            v_slot_start := v_slot_start + INTERVAL '30 minutes';
            CONTINUE;
        END IF;

        -- Skip if conflicts with existing booking
        SELECT EXISTS (
            SELECT 1 FROM bookings b
            WHERE  b.stylist_id   = p_stylist_id
              AND  b.booking_date = p_date
              AND  b.status   NOT IN ('cancelled')
              AND (
                  (v_slot_start >= b.start_time AND v_slot_start < b.end_time)
               OR (v_slot_end::TIME > b.start_time AND v_slot_end::TIME <= b.end_time)
               OR (v_slot_start <= b.start_time AND v_slot_end::TIME >= b.end_time)
              )
        ) INTO v_has_booking;

        IF NOT v_has_booking THEN
            slot_time := v_slot_start;
            RETURN NEXT;
        END IF;

        v_slot_start := v_slot_start + INTERVAL '30 minutes';
    END LOOP;
END;
$$;

-- =============================================================================
-- 5. UPDATE get_available_slots_json
-- =============================================================================

CREATE OR REPLACE FUNCTION get_available_slots_json(
    p_stylist_id       UUID,
    p_date             DATE,
    p_duration_minutes INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(slot_time ORDER BY slot_time), '[]'::JSON)
        FROM   get_available_slots(p_stylist_id, p_date, p_duration_minutes)
    );
END;
$$;

-- =============================================================================
-- 6. UPDATE is_stylist_available_at
-- =============================================================================

CREATE OR REPLACE FUNCTION is_stylist_available_at(
    p_stylist_id UUID,
    p_datetime    TIMESTAMP
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_work_start         TIME;
    v_work_end           TIME;
    v_source             TEXT;
    v_slot_time          TIME;
    v_is_full_day_off    BOOLEAN;
    v_has_partial_exc    BOOLEAN;
    v_has_conflict       BOOLEAN;
BEGIN
    v_slot_time := p_datetime::TIME;

    -- Resolve effective schedule
    SELECT s.start_time, s.end_time, s.source
    INTO  v_work_start, v_work_end, v_source
    FROM  get_stylist_schedule_for_date(p_stylist_id, p_datetime::DATE) s;

    IF v_work_start IS NULL OR v_work_end IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Slot must be within effective working hours
    IF v_slot_time < v_work_start OR v_slot_time >= v_work_end THEN
        RETURN FALSE;
    END IF;

    -- Full-day exception?
    SELECT EXISTS (
        SELECT 1 FROM stylist_exceptions se
        WHERE  se.stylist_id     = p_stylist_id
          AND  se.exception_date = p_datetime::DATE
          AND  se.start_time  IS NULL
          AND  se.end_time    IS NULL
    ) INTO v_is_full_day_off;

    IF v_is_full_day_off THEN
        RETURN FALSE;
    END IF;

    -- Partial exception covers this time?
    SELECT EXISTS (
        SELECT 1 FROM stylist_exceptions se
        WHERE  se.stylist_id     = p_stylist_id
          AND  se.exception_date = p_datetime::DATE
          AND  se.start_time  IS NOT NULL
          AND  se.end_time    IS NOT NULL
          AND  v_slot_time >= se.start_time
          AND  v_slot_time <  se.end_time
    ) INTO v_has_partial_exc;

    IF v_has_partial_exc THEN
        RETURN FALSE;
    END IF;

    -- Conflicting booking?
    SELECT EXISTS (
        SELECT 1 FROM bookings b
        WHERE  b.stylist_id   = p_stylist_id
          AND  b.booking_date = p_datetime::DATE
          AND  b.status   NOT IN ('cancelled')
          AND (
              (b.start_time <= v_slot_time AND b.end_time > v_slot_time)
           OR (b.start_time <  v_slot_time + INTERVAL '1 minute'
               AND b.end_time > v_slot_time)
          )
    ) INTO v_has_conflict;

    RETURN NOT v_has_conflict;
END;
$$;

-- =============================================================================
-- 7. ENABLE RLS ON salon_schedule
-- =============================================================================

ALTER TABLE salon_schedule ENABLE ROW LEVEL SECURITY;

-- Anyone can read the schedule (needed for availability checks)
CREATE POLICY "Public read salon_schedule"
ON salon_schedule FOR SELECT USING (true);

-- Only authenticated (admin) can modify
CREATE POLICY "Authenticated can manage salon_schedule"
ON salon_schedule FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Also update the stylists RLS policy to allow reading custom hours
-- (the existing policies likely allow SELECT *, which already covers new columns)

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Test: Check effective schedule for a stylist
-- SELECT * FROM get_stylist_schedule_for_date('YOUR_STYLIST_ID', CURRENT_DATE + 1);

-- Test: Slot generation with custom hours
-- (set custom_work_start='14:00', custom_work_end='19:00' on a stylist first)
-- SELECT * FROM get_available_slots('YOUR_STYLIST_ID', CURRENT_DATE + 1, 30);

-- Test: Check salon schedule
-- SELECT * FROM salon_schedule ORDER BY day_of_week;
