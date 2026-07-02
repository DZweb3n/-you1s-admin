import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { jsonCors, preflight } from '@/lib/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://you-1s.com'
const FREE_SHIPPING_THRESHOLD = 100
const SHIPPING_FLAT = 5.9

type CartItem = { id: string; size?: string; qty: number }

function orderNumber(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `YS-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${rand}`
}

export async function OPTIONS(req: Request) {
  return preflight(req.headers.get('origin'))
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')

  try {
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) return jsonCors({ error: 'Paiement non configuré.' }, origin, 500)

    const body = await req.json().catch(() => null)
    if (!body) return jsonCors({ error: 'Requête invalide.' }, origin, 400)

    const items: CartItem[] = Array.isArray(body.items) ? body.items : []
    const customer = body.customer || {}
    const shipping = body.shipping || {}

    if (!items.length) return jsonCors({ error: 'Panier vide.' }, origin, 400)
    if (!customer.email || !customer.name)
      return jsonCors({ error: 'Nom et email requis.' }, origin, 400)
    if (!shipping.address || !shipping.zip || !shipping.city)
      return jsonCors({ error: 'Adresse de livraison incomplète.' }, origin, 400)

    const supabase = createAdminClient()

    // ── Validation serveur : on récupère les vrais produits (prix + stock) ──
    const ids = Array.from(new Set(items.map((i) => String(i.id))))

    // Ids non-UUID = panier périmé (anciens ids statiques) → message clair
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (ids.some((id) => !UUID_RE.test(id)))
      return jsonCors(
        { error: 'Votre panier a expiré. Videz-le puis ajoutez à nouveau vos articles.' },
        origin,
        409
      )
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, brand, price, stock, images, active')
      .in('id', ids)

    if (prodErr) return jsonCors({ error: 'Erreur produits.' }, origin, 500)

    const byId = new Map((products || []).map((p) => [String(p.id), p]))

    const orderItems: any[] = []
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    let subtotal = 0

    for (const it of items) {
      const p = byId.get(String(it.id))
      const qty = Math.max(1, Math.floor(Number(it.qty) || 1))
      if (!p || p.active === false)
        return jsonCors({ error: `Un article n'est plus disponible.` }, origin, 409)
      if (typeof p.stock === 'number' && p.stock < qty)
        return jsonCors(
          { error: `Stock insuffisant pour ${p.name}.` },
          origin,
          409
        )

      const price = Number(p.price)
      subtotal += price * qty

      orderItems.push({
        product_id: p.id,
        name: p.name,
        brand: p.brand || '',
        size: it.size || null,
        qty,
        price,
      })

      const imgs = Array.isArray(p.images) ? p.images : []
      const absImg = imgs.find((u: string) => typeof u === 'string' && u.startsWith('http'))

      lineItems.push({
        quantity: qty,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(price * 100),
          product_data: {
            name: it.size ? `${p.name} — Taille ${it.size}` : p.name,
            ...(absImg ? { images: [absImg] } : {}),
          },
        },
      })
    }

    // ── Code promo (validé serveur, jamais confiance au client) ──
    const promoCode = String(body.promo || '').trim().toUpperCase()
    const PROMOS: Record<string, number> = { YOU1S10: 10, YOU1S20: 20 }
    const promoPct = PROMOS[promoCode] || 0
    const discount = promoPct > 0 ? Math.round(subtotal * promoPct) / 100 : 0

    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
    const total = subtotal - discount + shippingCost
    const number = orderNumber()

    // ── Commande créée en "pending" (non payée) avant redirection Stripe ──
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: number,
        customer_email: String(customer.email).trim(),
        customer_name: String(customer.name).trim(),
        customer_phone: customer.phone ? String(customer.phone).trim() : null,
        shipping_address: {
          address: shipping.address,
          zip: shipping.zip,
          city: shipping.city,
          name: customer.name,
          phone: customer.phone || null,
        },
        items: orderItems,
        subtotal,
        shipping: shippingCost,
        discount,
        total,
        status: 'pending',
        paid: false,
        notes: 'En attente de paiement (Stripe)',
      })
      .select('id, order_number')
      .single()

    if (orderErr || !order)
      return jsonCors({ error: 'Impossible de créer la commande.' }, origin, 500)

    const stripe = new Stripe(secret)

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: lineItems,
      customer_email: String(customer.email).trim(),
      metadata: { order_id: order.id, order_number: order.order_number },
      success_url: `${SITE_URL}/merci.html?order=${encodeURIComponent(order.order_number)}`,
      cancel_url: `${SITE_URL}/panier.html?canceled=1`,
    }

    if (promoPct > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: promoPct,
        duration: 'once',
        name: promoCode,
      })
      sessionParams.discounts = [{ coupon: coupon.id }]
    }

    if (shippingCost > 0) {
      sessionParams.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: 'Livraison standard',
            fixed_amount: { amount: Math.round(shippingCost * 100), currency: 'eur' },
          },
        },
      ]
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    await supabase
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)

    return jsonCors({ url: session.url }, origin, 200)
  } catch (e: any) {
    const detail = e?.message || String(e)
    console.error('[checkout] error', detail)
    // detail non sensible (message d'erreur technique) — aide au diagnostic côté client
    return jsonCors({ error: 'Erreur serveur.', detail }, origin, 500)
  }
}
