import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'
import { boxtalConfigured, getQuotes } from '@/lib/boxtal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Renvoie les offres transporteurs (tarifs) pour une commande.
 * Body : { order_id, weight }
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  if (!boxtalConfigured())
    return NextResponse.json({ error: 'Boxtal non configuré (variables d’environnement manquantes).' }, { status: 500 })

  const body = await req.json().catch(() => null)
  const orderId = body?.order_id
  const weight = Number(body?.weight) || undefined
  if (!orderId) return NextResponse.json({ error: 'order_id manquant.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('shipping_address, customer_email')
    .eq('id', orderId)
    .single()
  if (error || !order) return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })

  const addr = order.shipping_address || {}
  if (!addr.zip || !addr.city)
    return NextResponse.json({ error: 'Adresse de livraison incomplète pour cette commande.' }, { status: 400 })

  try {
    const offers = await getQuotes(addr, weight ?? 2, order.customer_email)
    return NextResponse.json({ offers })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur cotation Boxtal.' }, { status: 502 })
  }
}
