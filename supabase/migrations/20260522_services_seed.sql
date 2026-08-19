-- Services: Pánsky Grooming - Salon Menu
TRUNCATE services RESTART IDENTITY CASCADE;

-- Special Offers
INSERT INTO services (name, description, category, price, duration_minutes, sort_order, is_active) VALUES
('Klasický strih', 'Konzultácia, strih strojčekom alebo nožnicami vrátane fade, začistenie kontúr britvou, umytie, vysušenie a styling vlasov.', 'specials', 18, 45, 0, true),
('Študentský strih', 'Trendý strih, rýchle umytie, základný styling. Nutné preukázať sa ISIC alebo študentským preukazom.', 'specials', 18, 35, 0, true),
('Strih a úprava brady', 'Kompletný strih vlasov, úprava a vytvarovanie brady, precízne začistenie kontúr britvou, olej na bradu a voda po holení.', 'specials', 25, 45, 0, true);

-- Regular Services
INSERT INTO services (name, description, category, price, duration_minutes, sort_order, is_active) VALUES
('Pánsky strih', 'Strih, styling, 1x umytie vlasov pred strihaním zdarma.', 'pansky', 15, 45, 1, true),
('Strih nožnicami', 'Strih výhradne nožnicami, 1x umytie vlasov pred strihaním zdarma.', 'pansky', 20, 50, 2, true),
('Detský strih (do 8 rokov)', 'Detský strih pre deti do 8 rokov.', 'pansky', 12, 30, 3, true),
('Úprava brady britvou', 'Úprava a holenie brady britvou.', 'pansky', 9, 20, 4, true),
('Umytie, sušenie a styling', 'Umytie, sušenie a styling vlasov.', 'pansky', 8, 20, 5, true),
('Farbenie vlasov', 'Profesionálne farbenie vlasov pre mužov.', 'pansky', 25, 90, 6, true),
('Melír', 'Melír — vybrané pramienky.', 'pansky', 35, 120, 7, true),
('Odfarbenie vlasov', 'Odfarbenie vlasov na požadovaný odtieň.', 'pansky', 40, 120, 8, true),
('Trvalá ondulácia', 'Trvalá ondulácia vlasov.', 'pansky', 35, 120, 9, true);
