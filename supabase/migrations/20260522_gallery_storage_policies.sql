-- =============================================================================
-- Gallery Storage Policies
-- Chạy trong Supabase SQL Editor để tạo policies cho bucket "gallery"
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. PUBLIC READ ACCESS - Ai cũng xem được ảnh
-- =============================================================================

DROP POLICY IF EXISTS "Public can view gallery images" ON storage.objects;
CREATE POLICY "Public can view gallery images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gallery');

-- =============================================================================
-- 2. PUBLIC UPLOAD - Ai cũng upload được (cho API)
-- =============================================================================

DROP POLICY IF EXISTS "Public can upload gallery images" ON storage.objects;
CREATE POLICY "Public can upload gallery images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'gallery');

-- =============================================================================
-- 3. PUBLIC UPDATE - Ai cũng update được (cho API)
-- =============================================================================

DROP POLICY IF EXISTS "Public can update gallery images" ON storage.objects;
CREATE POLICY "Public can update gallery images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');

-- =============================================================================
-- 4. PUBLIC DELETE - Ai cũng xóa được (cho API)
-- =============================================================================

DROP POLICY IF EXISTS "Public can delete gallery images" ON storage.objects;
CREATE POLICY "Public can delete gallery images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'gallery');

COMMIT;

-- =============================================================================
-- VERIFICATION: Chạy query này để kiểm tra policies đã tạo
-- =============================================================================

-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
