-- ============================================================
-- YOU1S — ÉTAPE 9 : la page Marques pilote l'affichage dans le menu
-- À exécuter dans Supabase → SQL Editor → New Query → Run
-- Idempotent : relançable sans risque.
-- ============================================================
-- Par défaut, le site ne pouvait lire QUE les marques actives, donc
-- « désactiver une marque » ne suffisait pas à la masquer du menu
-- (elle restait déduite des produits). On autorise la lecture de
-- toutes les marques (nom/logo/ordre/actif) — infos publiques —
-- et c'est le site qui masque les marques marquées inactives.

DROP POLICY IF EXISTS "Public read brands" ON brands;
CREATE POLICY "Public read brands" ON brands
  FOR SELECT TO anon
  USING (true);

-- Vérification
SELECT name, sort_order, active FROM brands ORDER BY sort_order;
