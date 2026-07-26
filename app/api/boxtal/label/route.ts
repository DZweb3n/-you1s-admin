import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'
import { boxtalConfigured, getLabelPdf } from '@/lib/boxtal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Renvoie le bordereau d'envoi (PDF) d'une commande, prêt à imprimer.
 * Ouvert directement dans un onglet : ?order_id=…  (la session admin est
 * transmise par le cookie du navigateur).
 */
export async function GET(req: Request) {
  if (!(await isAdmin())) return new NextResponse('Non autorisé.', { status: 401 })
  if (!boxtalConfigured()) return new NextResponse('Boxtal non configuré.', { status: 500 })

  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('order_id')
  if (!orderId) return new NextResponse('order_id manquant.', { status: 400 })

  const supabase = createAdminClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('order_number, boxtal_ref, boxtal_label_url')
    .eq('id', orderId)
    .single()
  if (error || !order) return new NextResponse('Commande introuvable.', { status: 404 })
  if (!order.boxtal_ref) return new NextResponse('Aucune expédition Boxtal pour cette commande.', { status: 404 })

  try {
    const pdf = await getLabelPdf(order.boxtal_ref, order.boxtal_label_url || undefined)
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="bordereau-${order.order_number || order.boxtal_ref}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    return new NextResponse(e?.message || 'Bordereau indisponible.', { status: 502 })
  }
}
