-- ============================================================
-- YOU1S — ÉTAPE 7 : Type (sous-catégorie) sur les produits
-- À exécuter dans Supabase → SQL Editor → New Query → Run
-- Idempotent : relançable sans risque.
-- ============================================================
-- Structure cible : 4 grandes catégories (Chaussures, Hauts, Bas,
-- Accessoires) ; chaque produit peut avoir un "type" = une des
-- sous-catégories de sa catégorie (ex : Hauts → Hoodies).

-- 1) Colonne type sur les produits
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 2) Types des produits de démonstration (reconnus par leur slug)
UPDATE products SET subcategory = 'Sneakers'  WHERE slug IN ('gel-cumulus-16-aqua','chuck-taylor','cloudsurf','lx-old-skool','p6000') AND (subcategory IS NULL OR subcategory = '');
UPDATE products SET subcategory = 'T-shirts'  WHERE slug IN ('t-shirt-menilo','essential-tee') AND (subcategory IS NULL OR subcategory = '');
UPDATE products SET subcategory = 'Hoodies'   WHERE slug = 'hoodie-atelier' AND (subcategory IS NULL OR subcategory = '');
UPDATE products SET subcategory = 'Pantalons' WHERE slug = 'atm-pant' AND (subcategory IS NULL OR subcategory = '');

-- 3) Vérification : produits avec catégorie + type
SELECT p.name, c.name AS categorie, p.subcategory AS type
FROM products p LEFT JOIN categories c ON c.id = p.category_id
ORDER BY c.sort_order, p.name;
