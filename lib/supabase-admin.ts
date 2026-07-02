import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase côté SERVEUR uniquement.
 * Utilise la clé service_role : contourne les RLS pour créer/mettre à jour
 * les commandes après un paiement validé. Ne JAMAIS l'importer dans un
 * composant client — cette clé ne doit jamais atteindre le navigateur.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase mal configuré : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.'
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
