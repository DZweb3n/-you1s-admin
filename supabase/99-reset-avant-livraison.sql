-- ============================================================
--  YOU1S — Remise à zéro AVANT livraison au client
--  À lancer dans Supabase → SQL Editor → New query → Run
--
--  Ce script SUPPRIME uniquement les données de TEST transactionnelles
--  (commandes, clients, mouvements de stock) qui alimentent le dashboard
--  et les statistiques. Le CATALOGUE est intégralement conservé :
--    ✅ produits, catégories, marques, contenu du site → INTACTS
--    🗑️ commandes, clients, mouvements de stock → remis à 0
--
--  Résultat : le dashboard et les stats repartent à 0 (CA, commandes,
--  clients), mais tous les produits déjà saisis restent en place.
-- ============================================================

-- 1) Mouvements de stock (liés aux ventes de test) — supprimés en premier
--    car ils référencent les commandes (clé étrangère).
DELETE FROM stock_movements;

-- 2) Commandes de test (Test Claude, Ilyes Test, etc.)
DELETE FROM orders;

-- 3) Clients de test (créés lors des paiements de test)
DELETE FROM customers;

-- ── (OPTIONNEL) Réajuster le stock des produits de démo ──────────────
-- Les commandes de test « confirmées » ont décrémenté le stock via un
-- trigger. Supprimer les commandes ne le remonte PAS automatiquement.
-- Si tu GARDES des produits de démo et veux repartir d'un stock connu,
-- décommente et adapte la ligne ci-dessous (ex. tout remettre à 20) :
--
-- UPDATE products SET stock = 20 WHERE active = true;
--
-- (À ignorer si tu remplaces les produits de démo par tes vrais produits :
--  tu définiras le bon stock directement dans l'admin à ce moment-là.)

-- ── Vérification (facultatif) : doit renvoyer 0, 0, 0 ──
SELECT
  (SELECT count(*) FROM orders)          AS commandes_restantes,
  (SELECT count(*) FROM customers)       AS clients_restants,
  (SELECT count(*) FROM stock_movements) AS mouvements_restants;
