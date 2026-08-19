-- Make gallery bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'gallery';

-- Also check existing files have correct metadata
UPDATE storage.objects
SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{metadata}', '{"public": true}')
WHERE bucket_id = 'gallery';
