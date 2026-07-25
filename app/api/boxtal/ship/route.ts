import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'
import { boxtalConfigured, createShipment } from '@/lib/boxtal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Crée l'expédition Boxtal pour une commande (facturé par Boxtal en prod),
 * enregistre la référence + le suivi, puis passe la commande en « expédiée ».
 * Body : { order_id, weight, operator, service }
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  if (!boxtalConfigured())
    return NextResponse.json({ error: 'Boxtal non configuré (variables d’environnement manquantes).' }, { status: 500 })

  const body = await req.json().catch(() => null)
  const orderId = body?.order_id
  const operator = String(body?.operator || '')
  const service = String(body?.service || '')
  const weight = Number(body?.weight) || 2
  if (!orderId || !operator || !service)
    return NextResponse.json({ error: 'order_id, operator et service sont requis.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, shipping_address, customer_email, items, subtotal, total, boxtal_ref')
    .eq('id', orderId)
    .single()
  if (error || !order) return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })

  if (order.boxtal_ref)
    return NextResponse.json({ error: 'Une expédition existe déjà pour cette commande.', ref: order.boxtal_ref }, { status: 409 })

  const addr = order.shipping_address || {}
  const items = Array.isArray(order.items) ? order.items : []
  const description =
    items
      .map((i: any) => i?.name)
      .filter(Boolean)
      .join(', ') || 'Vetements / chaussures'

  try {
    const shipment = await createShipment(addr, weight, operator, service, {
      email: order.customer_email,
      description,
      value: Number(order.subtotal ?? order.total ?? 0),
    })

    await supabase
      .from('orders')
      .update({
        boxtal_ref: shipment.ref,
        carrier: operator,
        shipping_weight: weight,
        tracking_number: shipment.tracking || null,
        status: 'shipped',
      })
      .eq('id', orderId)

    return NextResponse.json({
      ref: shipment.ref,
      tracking: shipment.tracking,
      state: shipment.state,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur création expédition Boxtal.' }, { status: 502 })
  }
}
