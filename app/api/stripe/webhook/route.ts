import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Webhook Stripe. Appelé par Stripe (serveur à serveur), pas par le navigateur
 * → aucune CORS nécessaire. La signature est vérifiée avec STRIPE_WEBHOOK_SECRET
 * pour garantir que la requête vient bien de Stripe.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !webhookSecret) {
    return new Response('Webhook non configuré.', { status: 500 })
  }

  const stripe = new Stripe(secret)
  const sig = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig || '', webhookSecret)
  } catch (err: any) {
    console.error('[webhook] signature invalide', err?.message)
    return new Response(`Signature invalide: ${err?.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id

    // Sécurité : on ne confirme que si le paiement est réellement encaissé.
    const isPaid = session.payment_status === 'paid'

    if (orderId && isPaid) {
      try {
        const supabase = createAdminClient()

        // ── Coordonnées + adresse collectées PAR Stripe ──
        const details = session.customer_details
        // selon la version de l'API, l'adresse de livraison est dans shipping_details
        // ou collected_information.shipping_details
        const ship: any =
          (session as any).shipping_details ||
          (session as any).collected_information?.shipping_details ||
          null
        const addr = ship?.address || details?.address || null

        const shippingAddress = addr
          ? {
              name: ship?.name || details?.name || '',
              phone: details?.phone || '',
              address: [addr.line1, addr.line2].filter(Boolean).join(', '),
              zip: addr.postal_code || '',
              city: addr.city || '',
              country: addr.country || '',
            }
          : {}

        // ── Montants réels (livraison choisie + promo appliqués par Stripe) ──
        const td = session.total_details
        const shippingCost = td?.amount_shipping != null ? td.amount_shipping / 100 : 0
        const discount = td?.amount_discount != null ? td.amount_discount / 100 : 0
        const total = session.amount_total != null ? session.amount_total / 100 : undefined

        // pending → confirmed déclenche le trigger de décrément du stock.
        const { error } = await supabase
          .from('orders')
          .update({
            paid: true,
            status: 'confirmed',
            notes: 'Payé via Stripe',
            customer_email: details?.email || '',
            customer_name: details?.name || shippingAddress.name || 'Client',
            customer_phone: details?.phone || null,
            shipping_address: shippingAddress,
            shipping: shippingCost,
            discount,
            ...(total != null ? { total } : {}),
          })
          .eq('id', orderId)
          .eq('status', 'pending') // idempotent : ne re-confirme pas une commande déjà traitée

        if (error) {
          console.error('[webhook] update commande échoué', error.message)
          return new Response('Erreur mise à jour commande.', { status: 500 })
        }
      } catch (e: any) {
        console.error('[webhook] erreur', e?.message)
        return new Response('Erreur serveur.', { status: 500 })
      }
    }
  }

  return new Response('ok', { status: 200 })
}
