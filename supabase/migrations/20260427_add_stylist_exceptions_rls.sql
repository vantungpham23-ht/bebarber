-- Migration: Add RLS policies for stylist_exceptions table
-- Purpose: Allow public read, authenticated users can write
-- Note: Admin check is done in frontend using NEXT_PUBLIC_ALLOWED_ADMIN_USER_ID

BEGIN;

-- Enable RLS
ALTER TABLE stylist_exceptions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to SELECT (for viewing availability)
CREATE POLICY "Anyone can view stylist exceptions"
ON stylist_exceptions
FOR SELECT
USING (true);

-- Policy: Allow authenticated users to INSERT (frontend handles admin check)
CREATE POLICY "Authenticated users can insert stylist exceptions"
ON stylist_exceptions
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to UPDATE
CREATE POLICY "Authenticated users can update stylist exceptions"
ON stylist_exceptions
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to DELETE
CREATE POLICY "Authenticated users can delete stylist exceptions"
ON stylist_exceptions
FOR DELETE
USING (auth.role() = 'authenticated');

COMMIT;
