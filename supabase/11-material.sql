-- ============================================================
--  YOU1S — Ajout du champ "Matière / Composition" aux produits
--  À lancer dans Supabase → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT;

-- Le champ est maintenant éditable depuis l'admin (fiche produit) et
-- s'affiche dans l'onglet « Composition » sur le site.
