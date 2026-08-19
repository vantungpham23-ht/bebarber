-- Drop old services table if exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'services') THEN
    DROP TABLE IF EXISTS services CASCADE;
  END IF;
END
$$;

-- Create services table for Be. Barber
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  price_max NUMERIC(10, 2),
  category TEXT NOT NULL DEFAULT 'haircuts',
  sort_order INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on services" ON services;
CREATE POLICY "Allow all on services" ON services FOR ALL USING (true);

-- ============================================================
-- SPECIAL OFFERS (sort_order = 0 — featured hero card)
-- ============================================================

INSERT INTO services (name, description, duration_minutes, price, price_max, category, sort_order, is_active) VALUES
  ('KLASICKÝ STRIH / Classic Cut',
   'Konzultácia, strih strojčekom alebo nožnicami vrátane fade, začistenie kontúr britvou, umytie, vysušenie a styling vlasov.',
   40, 18, NULL, 'specials', 0, true),
  ('ŠTUDENTSKÝ STRIH / Student Cut',
   'Trendý strih, rýchle umytie, základný styling. Nutné preukázať sa ISIC alebo študentským preukazom.',
   35, 16, 19, 'specials', 0, true),
  ('STRIH A ÚPRAVA BRADY / Classic Combo',
   'Kompletný strih vlasov, úprava a vytvarovanie brady, precízne začistenie kontúr britvou, olej na bradu a voda po holení.',
   45, 25, NULL, 'specials', 0, true);

-- ============================================================
-- REGULAR SERVICES
-- ============================================================

-- Haircuts
INSERT INTO services (name, description, duration_minutes, price, price_max, category, sort_order, is_active) VALUES
  ('PÁNSKY STRIH / Men''s Haircut',
   'Strih, styling, 1x umytie vlasov pred strihaním zdarma.',
   30, 15, NULL, 'haircuts', 1, true),
  ('STRIH NOŽNICAMI / Scissor Cut',
   'Strih výhradne nožnicami, 1x umytie vlasov pred strihaním zdarma.',
   45, 20, NULL, 'haircuts', 2, true),
  ('DETSKÝ STRIH / Kids Haircut',
   'Detský strih pre deti do 8 rokov.',
   30, 12, NULL, 'haircuts', 3, true);

-- Beard
INSERT INTO services (name, description, duration_minutes, price, price_max, category, sort_order, is_active) VALUES
  ('ÚPRAVA BRADY BRITVOU / Straight Razor Beard Trim',
   'Úprava a holenie brady britvou.',
   25, 6, 12, 'beard', 1, true);

-- Treatments
INSERT INTO services (name, description, duration_minutes, price, price_max, category, sort_order, is_active) VALUES
  ('UMYTIE, SUŠENIE A STYLING / Wash & Styling',
   'Umytie, sušenie a styling vlasov.',
   20, 8, NULL, 'treatments', 1, true);

-- Color
INSERT INTO services (name, description, duration_minutes, price, price_max, category, sort_order, is_active) VALUES
  ('FARBENIE VLASOV / Men''s Hair Coloring',
   'Profesionálne farbenie vlasov pre mužov.',
   40, 25, NULL, 'color', 1, true),
  ('MELÍR / Highlights',
   'Melír — vybrané pramienky.',
   60, 35, NULL, 'color', 2, true),
  ('ODFARBOVANIE VLASOV / Hair Bleaching',
   'Odfarbenie vlasov na požadovaný odtieň.',
   90, 40, NULL, 'color', 3, true),
  ('TRVALÁ ONDULÁCIA / Men''s Perm',
   'Trvalá ondulácia vlasov.',
   90, 35, NULL, 'treatments', 2, true);
