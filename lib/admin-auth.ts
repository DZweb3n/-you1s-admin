import { createServerSupabase } from './supabase-server'

/**
 * Vérifie qu'un administrateur est connecté (session Supabase valide).
 * Les routes API sont exclues du middleware : elles doivent contrôler
 * elles-mêmes l'accès. À utiliser sur toute route à effet de bord
 * (création d'expédition Boxtal, etc.).
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = createServerSupabase()
    const { data, error } = await supabase.auth.getUser()
    return !error && !!data.user
  } catch {
    return false
  }
}
