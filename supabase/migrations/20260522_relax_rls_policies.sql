-- Relax RLS policies for all tables (admin operations)

BEGIN;

-- Services
DROP POLICY IF EXISTS "Allow all on services" ON services;
CREATE POLICY "Allow all on services" ON services FOR ALL USING (true);

-- Stylists
DROP POLICY IF EXISTS "Public can view stylists" ON stylists;
DROP POLICY IF EXISTS "Authenticated users can insert stylists" ON stylists;
DROP POLICY IF EXISTS "Authenticated users can update stylists" ON stylists;
DROP POLICY IF EXISTS "Authenticated users can delete stylists" ON stylists;
DROP POLICY IF EXISTS "Allow all on stylists" ON stylists;
CREATE POLICY "Allow all on stylists" ON stylists FOR ALL USING (true);

-- Stylist services
DROP POLICY IF EXISTS "Public can view stylist_services" ON stylist_services;
DROP POLICY IF EXISTS "Allow authenticated modify on stylist_services" ON stylist_services;
DROP POLICY IF EXISTS "Allow all on stylist_services" ON stylist_services;
CREATE POLICY "Allow all on stylist_services" ON stylist_services FOR ALL USING (true);

-- Working hours
DROP POLICY IF EXISTS "Public can view working_hours" ON working_hours;
DROP POLICY IF EXISTS "Allow authenticated modify on working_hours" ON working_hours;
DROP POLICY IF EXISTS "Allow all on working_hours" ON working_hours;
CREATE POLICY "Allow all on working_hours" ON working_hours FOR ALL USING (true);

-- Bookings
DROP POLICY IF EXISTS "Public can read bookings" ON bookings;
DROP POLICY IF EXISTS "Allow public read on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated insert on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated update on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated delete on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow all on bookings" ON bookings;
CREATE POLICY "Allow all on bookings" ON bookings FOR ALL USING (true);

-- Stylist exceptions
DROP POLICY IF EXISTS "Public can view stylist exceptions" ON stylist_exceptions;
DROP POLICY IF EXISTS "Authenticated users can insert exceptions" ON stylist_exceptions;
DROP POLICY IF EXISTS "Authenticated users can update exceptions" ON stylist_exceptions;
DROP POLICY IF EXISTS "Authenticated users can delete exceptions" ON stylist_exceptions;
DROP POLICY IF EXISTS "Allow all on stylist_exceptions" ON stylist_exceptions;
CREATE POLICY "Allow all on stylist_exceptions" ON stylist_exceptions FOR ALL USING (true);

-- Salon schedule
DROP POLICY IF EXISTS "Public can read salon_schedule" ON salon_schedule;
DROP POLICY IF EXISTS "Allow authenticated update on salon_schedule" ON salon_schedule;
DROP POLICY IF EXISTS "Allow all on salon_schedule" ON salon_schedule;
CREATE POLICY "Allow all on salon_schedule" ON salon_schedule FOR ALL USING (true);

-- Gallery items
DROP POLICY IF EXISTS "Public can view active gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Allow authenticated insert on gallery_items" ON gallery_items;
DROP POLICY IF EXISTS "Allow authenticated update on gallery_items" ON gallery_items;
DROP POLICY IF EXISTS "Allow authenticated delete on gallery_items" ON gallery_items;
DROP POLICY IF EXISTS "Allow all on gallery_items" ON gallery_items;
CREATE POLICY "Allow all on gallery_items" ON gallery_items FOR ALL USING (true);

-- Gallery likes
DROP POLICY IF EXISTS "Public can view gallery likes" ON gallery_likes;
DROP POLICY IF EXISTS "Allow authenticated insert on gallery_likes" ON gallery_likes;
DROP POLICY IF EXISTS "Allow authenticated delete on gallery_likes" ON gallery_likes;
DROP POLICY IF EXISTS "Allow all on gallery_likes" ON gallery_likes;
CREATE POLICY "Allow all on gallery_likes" ON gallery_likes FOR ALL USING (true);

COMMIT;
