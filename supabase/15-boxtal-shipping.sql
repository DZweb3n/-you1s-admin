-- ============================================================
--  15 — Boxtal : expédition & bordereaux d'envoi par commande
--  À exécuter dans Supabase → SQL Editor (une seule fois).
-- ============================================================

-- Référence d'expédition renvoyée par Boxtal (20 caractères) : sert à
-- (re)télécharger le bordereau et à suivre l'état de l'envoi.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS boxtal_ref TEXT;

-- Transporteur retenu (ex. "Mondial Relay", "Chronopost") — affichage admin.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;

-- Poids du colis (kg) utilisé pour la cotation/l'expédition.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_weight NUMERIC(6,2);

-- Index pour retrouver une commande depuis sa référence Boxtal.
CREATE INDEX IF NOT EXISTS idx_orders_boxtal_ref ON orders (boxtal_ref);

-- Rappel : le numéro de suivi transporteur est stocké dans la colonne
-- existante `tracking_number`. Les écritures Boxtal se font côté serveur
-- (routes API admin, service_role) → aucun GRANT anon requis.
