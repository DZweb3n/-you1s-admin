-- ============================================
-- 13 — STOCK PAR TAILLE
-- Ajoute une colonne jsonb qui stocke la quantité disponible
-- pour chaque taille d'un produit, ex : {"42": 3, "43": 0, "M": 5}
--
-- À exécuter dans Supabase → SQL Editor → Run.
-- ============================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size_stock jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN products.size_stock IS
  'Stock par taille : objet {taille: quantité}. Le champ stock global = somme.';
