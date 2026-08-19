-- Change slot interval from 15 min to 30 min

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
    v_current_time := (NOW() AT TIME ZONE 'Europe/Bratislava')::TIME;

    SELECT s.start_time, s.end_time, s.source
    INTO  v_work_start, v_work_end, v_source
    FROM  get_stylist_schedule_for_date(p_stylist_id, p_date) s;

    IF v_work_start IS NULL OR v_work_end IS NULL THEN
        RETURN;
    END IF;

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

        IF v_slot_end::TIME > v_work_end THEN
            EXIT;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM stylist_exceptions se
            WHERE  se.stylist_id       = p_stylist_id
              AND  se.exception_date    = p_date
              AND (se.start_time IS NULL
                   OR
                   v_slot_start < se.end_time
                      AND v_slot_end::TIME > se.start_time)
        ) INTO v_has_exception;

        IF v_has_exception THEN
            v_slot_start := v_slot_start + INTERVAL '30 minutes';
            CONTINUE;
        END IF;

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
