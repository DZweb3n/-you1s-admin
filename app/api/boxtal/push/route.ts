import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Callback Boxtal (url_push). Appelé par Boxtal (serveur→serveur) quand le
 * suivi ou les documents de l'expédition évoluent. PUBLIC mais protégé par un
 * token (BOXTAL_PUSH_TOKEN) passé dans l'URL. Met à jour la commande :
 *  - carrier_reference → tracking_number
 *  - label_url         → boxtal_label_url
 *  - etat (ENV/LIV/ANN) → status
 * Répond toujours 200 pour accuser réception (sinon Boxtal réessaie).
 */
async function handle(req: Request) {
  const { searchParams } = new URL(req.url)

  // Vérif token (si configuré). En cas de mismatch : on ack sans rien changer.
  const expected = process.env.BOXTAL_PUSH_TOKEN || ''
  if (expected && searchParams.get('token') !== expected) {
    return new NextResponse('ok', { status: 200 })
  }

  const ourRef = searchParams.get('ref') // notre id de commande (posé dans url_push)
  const boxtalRef = searchParams.get('emc_reference') || searchParams.get('envoi') || ''
  const carrierRef = searchParams.get('carrier_reference') || ''
  const labelUrl = searchParams.get('label_url') || ''
  const etat = (searchParams.get('etat') || '').toUpperCase()

  const patch: Record<string, any> = {}
  if (carrierRef) patch.tracking_number = carrierRef
  if (labelUrl) patch.boxtal_label_url = labelUrl
  if (etat === 'ENV') patch.status = 'shipped'
  else if (etat === 'LIV') patch.status = 'delivered'
  else if (etat === 'ANN') patch.status = 'cancelled'

  if (Object.keys(patch).length && (ourRef || boxtalRef)) {
    try {
      const supabase = createAdminClient()
      const q = supabase.from('orders').update(patch)
      if (ourRef) await q.eq('id', ourRef)
      else await q.eq('boxtal_ref', boxtalRef)
    } catch {
      /* on ack quand même : Boxtal ne doit pas boucler sur une erreur DB */
    }
  }

  return new NextResponse('ok', { status: 200 })
}

export async function GET(req: Request) {
  return handle(req)
}
export async function POST(req: Request) {
  return handle(req)
}
