-- ============================================================
-- YOU1S — ÉTAPE 8 : Choix des produits « Prêt à porter » (accueil)
-- À exécuter dans Supabase → SQL Editor → New Query → Run
-- Idempotent : relançable sans risque.
-- ============================================================
-- Ajoute un interrupteur « Prêt à porter » sur chaque produit,
-- comme « À la une » mais pour la section Prêt à porter de l'accueil.

ALTER TABLE products ADD COLUMN IF NOT EXISTS pret_a_porter BOOLEAN DEFAULT false;

-- (optionnel) mettre quelques vêtements en avant par défaut
UPDATE products SET pret_a_porter = true
WHERE slug IN ('t-shirt-menilo', 'essential-tee', 'hoodie-atelier', 'atm-pant')
  AND pret_a_porter = false;

-- Vérification
SELECT name, pret_a_porter FROM products WHERE pret_a_porter = true;
