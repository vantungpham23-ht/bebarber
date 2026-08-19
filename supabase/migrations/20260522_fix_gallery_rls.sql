-- =============================================================================
-- Fix Gallery RLS Policies
-- Chạy trong Supabase SQL Editor
-- =============================================================================

BEGIN;

-- Xóa policies cũ
DROP POLICY IF EXISTS "Public can read active gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Admin can manage gallery items" ON gallery_items;

-- Policy mới: Tất cả user (kể cả anonymous) đều đọc được gallery_items active
DROP POLICY IF EXISTS "Allow public read gallery items" ON gallery_items;
CREATE POLICY "Allow public read gallery items"
ON gallery_items
FOR SELECT
USING (true);

-- Policy cho phép authenticated users quản lý gallery
DROP POLICY IF EXISTS "Allow authenticated manage gallery items" ON gallery_items;
CREATE POLICY "Allow authenticated manage gallery items"
ON gallery_items
FOR ALL
USING (auth.role() = 'authenticated');

COMMIT;

-- Verify: Chạy query này để kiểm tra
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'gallery_items';
