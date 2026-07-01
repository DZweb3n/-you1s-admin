-- ============================================================
-- YOU1S — CORRECTIF PERMISSIONS + DONNÉES DE DÉMARRAGE
-- À exécuter dans Supabase → SQL Editor → New Query → Run
-- ============================================================
-- Contexte : le schema.sql d'origine a créé les tables et les
-- policies RLS, mais PAS les GRANT de table. Résultat : les rôles
-- API (anon / authenticated / service_role) reçoivent
-- « 42501 permission denied » → l'admin est vide et le site
-- tombe sur ses données de secours. Ce script règle les GRANT
-- puis insère des catégories et produits de démonstration.
-- Il est IDEMPOTENT : on peut le relancer sans casser l'existant.
-- ============================================================


-- 1) ─── GRANTS : donner l'accès aux rôles API ───────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Lecture publique (le RLS filtre déjà active = true)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Admin connecté + clé service = accès complet
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Les FUTURES tables héritent automatiquement de ces droits
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO authenticated, service_role;


-- 2) ─── CATÉGORIES ──────────────────────────────────────────
-- Les slugs DOIVENT correspondre à ceux attendus par le front
-- (sneakers, tshirts, hoodies, pants, jackets, accessories).
INSERT INTO categories (name, slug, description, sort_order, active) VALUES
  ('Chaussures',  'sneakers',    'Sneakers, running, boots et slides.', 1, true),
  ('T-shirts',    'tshirts',     'T-shirts et hauts en coton premium.', 2, true),
  ('Hoodies',     'hoodies',     'Hoodies et sweatshirts.',             3, true),
  ('Pantalons',   'pants',       'Pantalons, cargos et joggings.',      4, true),
  ('Vestes',      'jackets',     'Vestes et bombers.',                  5, true),
  ('Accessoires', 'accessories', 'Casquettes, sacs et accessoires.',    6, true)
ON CONFLICT (slug) DO NOTHING;


-- 3) ─── PRODUITS DE DÉMONSTRATION ───────────────────────────
-- Reprend le catalogue actuel du site. Les images pointent vers
-- les fichiers déjà présents dans /img/prooduits/.
-- category_id est résolu via le slug (sous-requête).
INSERT INTO products (name, slug, description, brand, price, compare_price, category_id, images, sizes, colors, stock, active) VALUES
  ('Gel Cumulus 16 Aqua', 'gel-cumulus-16-aqua', 'La Gel Cumulus 16 en coloris Aqua. Amorti GEL pour un confort optimal.', 'Asics', 149, NULL,
    (SELECT id FROM categories WHERE slug='sneakers'),
    '["img/prooduits/asics-16.webp"]', '[39,40,41,42,43,44,45]', '["Bleu","Noir"]', 12, true),

  ('Chuck Taylor', 'chuck-taylor', 'La Chuck Taylor All Star iconique. Toile canvas, semelle vulcanisée.', 'Converse', 89, NULL,
    (SELECT id FROM categories WHERE slug='sneakers'),
    '["img/prooduits/chuck.jpg"]', '[36,37,38,39,40,41,42,43,44]', '["Noir","Blanc"]', 20, true),

  ('Cloudsurf', 'cloudsurf', 'La Cloudsurf par On Running. Technologie CloudTec pour un amorti révolutionnaire.', 'On', 159, NULL,
    (SELECT id FROM categories WHERE slug='sneakers'),
    '["img/prooduits/cloudsurf.webp"]', '[39,40,41,42,43,44,45]', '["Blanc","Noir"]', 8, true),

  ('LX Old Skool', 'lx-old-skool', 'La Old Skool version LX premium. Suede et canvas, semelle waffle.', 'Vans', 99, NULL,
    (SELECT id FROM categories WHERE slug='sneakers'),
    '["img/prooduits/vans-lx-old-skool.webp"]', '[38,39,40,41,42,43,44,45]', '["Noir","Blanc"]', 15, true),

  ('T-shirt Menilo', 't-shirt-menilo', 'T-shirt Menilo en coton premium. Coupe regular, finitions soignées.', 'Menilo', 49, NULL,
    (SELECT id FROM categories WHERE slug='tshirts'),
    '["img/prooduits/tshirt-menilo.jpg"]', '["S","M","L","XL","XXL"]', '["Noir","Blanc","Gris"]', 30, true),

  ('P6000', 'p6000', 'La Nike P-6000 au design rétro des années 2000. Confort et style urbain.', 'Nike', 119, NULL,
    (SELECT id FROM categories WHERE slug='sneakers'),
    '["img/prooduits/nike-P6000.webp"]', '[40,41,42,43,44,45]', '["Blanc","Gris"]', 10, true),

  ('Essential Tee', 'essential-tee', 'Le T-shirt essentiel You1s. Coton épais 220g, coupe boxy légèrement oversize.', 'You1s', 49, 69,
    (SELECT id FROM categories WHERE slug='tshirts'),
    '["img/prooduits/essential1.webp"]', '["XS","S","M","L","XL"]', '["Blanc","Noir","Gris"]', 25, true),

  ('ATM Pant', 'atm-pant', 'Le pantalon ATM You1s. Coupe carrot décontractée, taille élastiquée avec cordon.', 'You1s', 89, 119,
    (SELECT id FROM categories WHERE slug='pants'),
    '["img/prooduits/atm-pant.webp"]', '["S","M","L","XL"]', '["Noir","Gris"]', 18, true),

  ('Hoodie Atelier', 'hoodie-atelier', 'Le hoodie Atelier de Menilo. Tissu lourd 420g, coupe oversized signature.', 'Menilo', 119, 149,
    (SELECT id FROM categories WHERE slug='hoodies'),
    '["img/prooduits/atelier-menilo.jpg"]', '["S","M","L","XL","XXL"]', '["Beige","Gris","Noir"]', 14, true),

  ('Incontournable', 'incontournable', 'L''accessoire incontournable You1s. Finition premium, polyvalent.', 'You1s', 59, NULL,
    (SELECT id FROM categories WHERE slug='accessories'),
    '["img/prooduits/incontournable.jpg"]', '["Unique"]', '["Noir","Beige"]', 40, true)
ON CONFLICT (slug) DO NOTHING;


-- 4) ─── MARQUES (carrousel logos) ───────────────────────────
INSERT INTO brands (name, logo_url, sort_order, active) VALUES
  ('Nike',        'img/brands/nike.png',       1, true),
  ('Asics',       'img/brands/asics.png',      2, true),
  ('Saucony',     'img/brands/saucony.png',    3, true),
  ('New Balance', 'img/brands/newbalance.png', 4, true),
  ('On',          'img/brands/on.png',         5, true)
ON CONFLICT DO NOTHING;


-- 5) ─── VÉRIFICATION ────────────────────────────────────────
-- Doit renvoyer des lignes (plus « permission denied »).
SELECT 'categories' AS table, count(*) FROM categories
UNION ALL SELECT 'products', count(*) FROM products
UNION ALL SELECT 'brands', count(*) FROM brands
UNION ALL SELECT 'site_content', count(*) FROM site_content;
