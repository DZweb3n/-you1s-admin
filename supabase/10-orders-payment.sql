-- ============================================================
--  10 — Paiement Stripe : colonnes de suivi sur les commandes
--  À exécuter dans Supabase → SQL Editor (une seule fois).
-- ============================================================

-- Marque une commande comme payée (webhook Stripe) + référence de session.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Index pour retrouver une commande depuis sa session Stripe.
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders (stripe_session_id);

-- Rappel : le service_role contourne déjà les RLS ; aucun GRANT anon requis.
-- Les commandes sont créées/mises à jour uniquement côté serveur (API Vercel).
