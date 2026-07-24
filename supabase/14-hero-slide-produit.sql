-- ============================================
-- 14 — PRODUIT ASSOCIÉ À UN SLIDE D'ACCUEIL
-- Permet de lier un produit à l'un des 5 slides du hero d'accueil.
-- Quand c'est renseigné, le bouton « Découvrir » du slide mène
-- directement à la fiche de ce produit (produit.html?id=...).
--
-- Valeur : 1 à 5 = numéro du slide (voir Contenu → Slider accueil),
--          NULL = aucun (le bouton garde son lien par défaut).
--
-- À exécuter dans Supabase → SQL Editor → Run.
-- ============================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hero_slide smallint;

COMMENT ON COLUMN products.hero_slide IS
  'Slide d''accueil (1-5) dont le bouton Découvrir pointe vers ce produit. NULL = aucun.';
