-- Xóa services không phải pansky và các liên kết stylist_services

-- Xóa các stylist_services liên quan đến services không phải pansky
DELETE FROM stylist_services
WHERE service_id IN (
  SELECT id FROM services WHERE category != 'pansky'
);

-- Xóa services không phải pansky
DELETE FROM services WHERE category != 'pansky';

-- Update các service còn lại về category 'pansky' (đảm bảo)
UPDATE services SET category = 'pansky' WHERE category != 'pansky';
