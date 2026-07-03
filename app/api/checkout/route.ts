import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { jsonCors, preflight } from '@/lib/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://you-1s.com'
const FREE_SHIPPING_THRESHOLD = 100
const SHIPPING_FLAT = 5.9
const SHIPPING_EXPRESS = 9.9

/* Pays où l'on livre (Stripe affiche le sélecteur d'adresse pour ces pays) */
const ALLOWED_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ['FR', 'BE', 'LU', 'MC']

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
    if (!items.length) return jsonCors({ error: 'Panier vide.' }, origin, 400)

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
        return jsonCors({ error: `Stock insuffisant pour ${p.name}.` }, origin, 409)

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

    const number = orderNumber()

    // ── Commande créée en "pending". L'adresse + le client seront remplis par le
    //    webhook à partir de ce que Stripe aura collecté (colonnes NOT NULL → placeholders). ──
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: number,
        customer_email: '',
        customer_name: 'En attente (paiement Stripe)',
        shipping_address: {},
        items: orderItems,
        subtotal,
        shipping: 0,
        discount: 0,
        total: subtotal, // recalculé par le webhook avec livraison + promo réels
        status: 'pending',
        paid: false,
        notes: 'En attente de paiement (Stripe)',
      })
      .select('id, order_number')
      .single()

    if (orderErr || !order)
      return jsonCors({ error: 'Impossible de créer la commande.' }, origin, 500)

    const stripe = new Stripe(secret)

    // ── Modes de livraison proposés SUR la page Stripe (comme un checkout Shopify) ──
    const standardAmount =
      subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : Math.round(SHIPPING_FLAT * 100)
    const shipping_options: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name:
            standardAmount === 0 ? 'Livraison offerte (3–5 jours)' : 'Livraison standard (3–5 jours)',
          fixed_amount: { amount: standardAmount, currency: 'eur' },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 3 },
            maximum: { unit: 'business_day', value: 5 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: 'Livraison express (24–48h)',
          fixed_amount: { amount: Math.round(SHIPPING_EXPRESS * 100), currency: 'eur' },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 1 },
            maximum: { unit: 'business_day', value: 2 },
          },
        },
      },
    ]

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: lineItems,
      // Stripe collecte lui-même l'adresse, le téléphone et l'email :
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      shipping_options,
      // Apple Pay / Google Pay / Link s'affichent automatiquement (aucune config).
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

    const session = await stripe.checkout.sessions.create(sessionParams)

    await supabase.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id)

    return jsonCors({ url: session.url }, origin, 200)
  } catch (e: any) {
    console.error('[checkout] error', e?.message || e)
    return jsonCors(
      { error: 'Le paiement est momentanément indisponible, réessayez dans un instant.' },
      origin,
      500
    )
  }
}
