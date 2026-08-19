-- Fix existing gallery items URL (remove duplicate /gallery/ in path)
UPDATE gallery_items
SET 
  image_url = REPLACE(image_url, '/gallery/gallery/', '/gallery/'),
  thumbnail_url = REPLACE(thumbnail_url, '/gallery/gallery/', '/gallery/')
WHERE image_url LIKE '%/gallery/gallery/%';

-- Verify the fix
SELECT id, image_url FROM gallery_items LIMIT 5;
