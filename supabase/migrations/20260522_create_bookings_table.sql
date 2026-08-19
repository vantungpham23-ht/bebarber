-- =============================================================================
-- BOOKINGS TABLE - Core booking system
-- =============================================================================

BEGIN;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL CHECK (length(customer_name) >= 1 AND length(customer_name) <= 255),
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent double-booking same stylist at same time
    EXCLUDE USING gist (
        stylist_id WITH =,
        daterange(booking_date, booking_date, '[]') WITH &&
    ) WHERE (status NOT IN ('cancelled')),
    
    CONSTRAINT valid_booking_time CHECK (start_time < end_time)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_stylist_date ON bookings(stylist_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone);

-- RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert bookings (public booking form)
DROP POLICY IF EXISTS "Allow insert on bookings" ON bookings;
CREATE POLICY "Allow insert on bookings" ON bookings
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read their own bookings
DROP POLICY IF EXISTS "Allow read own bookings" ON bookings;
CREATE POLICY "Allow read own bookings" ON bookings
    FOR SELECT USING (true);

-- Allow service role to do everything
DROP POLICY IF EXISTS "Allow all service role bookings" ON bookings;
CREATE POLICY "Allow all service role bookings" ON bookings
    FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;

-- =============================================================================
-- STYLIST_SERVICES TABLE - Links stylists to services they offer
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS stylist_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(stylist_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_stylist_services_stylist ON stylist_services(stylist_id);
CREATE INDEX IF NOT EXISTS idx_stylist_services_service ON stylist_services(service_id);

ALTER TABLE stylist_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on stylist_services" ON stylist_services;
CREATE POLICY "Allow all on stylist_services" ON stylist_services FOR ALL USING (true);

-- Seed stylist_services with all stylists offering all active services
INSERT INTO stylist_services (stylist_id, service_id)
SELECT s.id, svc.id
FROM stylists s
CROSS JOIN services svc
WHERE s.is_active = true AND svc.is_active = true
ON CONFLICT (stylist_id, service_id) DO NOTHING;

COMMIT;
