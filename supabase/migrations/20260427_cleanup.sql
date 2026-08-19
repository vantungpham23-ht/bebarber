-- =============================================================================
-- CLEANUP: Drop existing booking-related objects
-- Run THIS FILE FIRST
-- =============================================================================

BEGIN;

-- Drop functions first (they depend on tables)
DROP FUNCTION IF EXISTS get_available_slots_json(uuid, date, integer);
DROP FUNCTION IF EXISTS get_available_slots(uuid, date, integer);
DROP FUNCTION IF EXISTS get_stylist_exceptions_for_date(uuid, date);
DROP FUNCTION IF EXISTS is_stylist_available_at(uuid, timestamp);
DROP FUNCTION IF EXISTS get_stylist_exceptions(uuid);
DROP FUNCTION IF EXISTS create_stylist_exception(uuid, date, time, time, text);
DROP FUNCTION IF EXISTS create_stylist_exception(uuid, date, text);
DROP FUNCTION IF EXISTS delete_stylist_exception(uuid);
DROP FUNCTION IF EXISTS create_stylist_exception_partial(uuid, date, time, time, text);

-- Drop table (this will also drop any RLS policies)
DROP TABLE IF EXISTS stylist_exceptions CASCADE;

COMMIT;
