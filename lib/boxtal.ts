import { XMLParser } from 'fast-xml-parser'

/**
 * Client Boxtal (API v1 « envoimoinscher ») — SERVEUR UNIQUEMENT.
 * Flux : cotation (tarifs transporteurs) → order (création de l'expédition)
 * → bordereau PDF. Les identifiants ne quittent jamais le serveur.
 *
 * Voir BOXTAL-SETUP.md pour la configuration (compte + variables d'env).
 */

const ENV = (process.env.BOXTAL_ENV || 'test').toLowerCase()
const IS_PROD = ENV === 'prod' || ENV === 'production'

/* Serveurs API (le test renvoie de fausses expéditions, gratuites). */
const API_BASE = IS_PROD
  ? 'https://www.envoimoinscher.com'
  : 'https://test.envoimoinscher.com'

/* Serveur des documents (bordereaux PDF). Surchargable au besoin. */
const DOC_BASE =
  process.env.BOXTAL_DOC_SERVER ||
  (IS_PROD
    ? 'https://documents.envoimoinscher.com/documents'
    : 'https://test.envoimoinscher.com/documents')

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true })

export function boxtalConfigured(): boolean {
  return !!(process.env.BOXTAL_USER && process.env.BOXTAL_PASS)
}

function authHeader(): string {
  const user = process.env.BOXTAL_USER || ''
  const pass = process.env.BOXTAL_PASS || ''
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
}

function commonHeaders(): Record<string, string> {
  return {
    Authorization: authHeader(),
    'Accept-Language': 'en-US',
    'Api-Version': '1.3.7',
  }
}

/* Expéditeur (la boutique) — construit à partir des variables d'env. */
function shipperParams(): Record<string, string> {
  const p: Record<string, string> = {
    'shipper.country': process.env.BOXTAL_SENDER_COUNTRY || 'FR',
    'shipper.zipcode': process.env.BOXTAL_SENDER_ZIP || '',
    'shipper.city': process.env.BOXTAL_SENDER_CITY || '',
    'shipper.address': process.env.BOXTAL_SENDER_ADDRESS || '',
    'shipper.type': process.env.BOXTAL_SENDER_TYPE || 'company',
    'shipper.title': process.env.BOXTAL_SENDER_TITLE || 'M',
    'shipper.firstname': process.env.BOXTAL_SENDER_FIRSTNAME || '',
    'shipper.lastname': process.env.BOXTAL_SENDER_LASTNAME || '',
    'shipper.email': process.env.BOXTAL_SENDER_EMAIL || '',
    'shipper.phone': (process.env.BOXTAL_SENDER_PHONE || '').replace(/\s+/g, ''),
  }
  if (process.env.BOXTAL_SENDER_COMPANY) p['shipper.societe'] = process.env.BOXTAL_SENDER_COMPANY
  return p
}

export type ShippingAddress = {
  name?: string
  phone?: string
  address?: string
  zip?: string
  city?: string
  country?: string
}

/* Destinataire — construit à partir de l'adresse de livraison de la commande. */
function recipientParams(addr: ShippingAddress, email?: string): Record<string, string> {
  const full = String(addr.name || '').trim()
  const parts = full.split(/\s+/)
  const firstname = parts.length > 1 ? parts.slice(0, -1).join(' ') : full || 'Client'
  const lastname = parts.length > 1 ? parts[parts.length - 1] : full || 'Client'
  return {
    'recipient.country': (addr.country || 'FR').toUpperCase(),
    'recipient.zipcode': addr.zip || '',
    'recipient.city': addr.city || '',
    'recipient.address': addr.address || '',
    'recipient.type': 'individual',
    'recipient.title': 'M',
    'recipient.firstname': firstname,
    'recipient.lastname': lastname,
    'recipient.email': email || process.env.BOXTAL_SENDER_EMAIL || '',
    'recipient.phone': (addr.phone || '0600000000').replace(/\s+/g, ''),
  }
}

/* Colis : poids (kg) + dimensions par défaut (cm), surchargeables par env. */
function parcelParams(weightKg: number): Record<string, string> {
  const w = Math.max(0.1, Number(weightKg) || Number(process.env.BOXTAL_DEFAULT_WEIGHT) || 2)
  return {
    'colis_1.poids': String(w),
    'colis_1.longueur': process.env.BOXTAL_PARCEL_L || '35',
    'colis_1.largeur': process.env.BOXTAL_PARCEL_W || '25',
    'colis_1.hauteur': process.env.BOXTAL_PARCEL_H || '15',
  }
}

function contentParams(): Record<string, string> {
  return { content_code: process.env.BOXTAL_CONTENT_CODE || '10120' }
}

/** Une offre transporteur renvoyée par la cotation. */
export type BoxtalOffer = {
  operator: string
  operatorLabel: string
  service: string
  serviceLabel: string
  priceTTC: number
  priceHT: number
  currency: string
  deliveryLabel: string
  deliveryDate: string
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

function checkErrors(parsed: any): void {
  // Boxtal renvoie <error><message>…</message></error> en cas de refus.
  const err = parsed?.error || parsed?.cotation?.error || parsed?.order?.error
  if (err) {
    const msg = err?.message || (typeof err === 'string' ? err : 'Requête Boxtal refusée')
    throw new Error(String(msg))
  }
}

/** Cotation : renvoie les offres transporteurs commandables (mode COM). */
export async function getQuotes(
  addr: ShippingAddress,
  weightKg: number,
  email?: string
): Promise<BoxtalOffer[]> {
  const params = {
    ...shipperParams(),
    ...recipientParams(addr, email),
    ...parcelParams(weightKg),
    ...contentParams(),
  }
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}/api/v1/cotation?${qs}`, { headers: commonHeaders() })
  const text = await res.text()
  if (!res.ok && res.status !== 400) {
    throw new Error(`Boxtal cotation : HTTP ${res.status}`)
  }
  const parsed = parser.parse(text)
  checkErrors(parsed)

  const offers = asArray<any>(parsed?.cotation?.shipment?.offer)
  const out: BoxtalOffer[] = []
  for (const o of offers) {
    if (o?.mode !== 'COM') continue // COM = commandable directement
    const price = o.price || {}
    out.push({
      operator: String(o.operator?.code ?? ''),
      operatorLabel: String(o.operator?.label ?? o.operator?.code ?? ''),
      service: String(o.service?.code ?? ''),
      serviceLabel: String(o.service?.label ?? ''),
      priceTTC: Number(price['tax-inclusive'] ?? price['tax-exclusive'] ?? 0),
      priceHT: Number(price['tax-exclusive'] ?? 0),
      currency: String(price.currency ?? 'EUR'),
      deliveryLabel: String(o.delivery?.label ?? ''),
      deliveryDate: String(o.delivery?.date ?? ''),
    })
  }
  // Moins cher d'abord
  out.sort((a, b) => a.priceTTC - b.priceTTC)
  return out
}

/** Résultat d'une création d'expédition. */
export type BoxtalShipment = {
  ref: string
  tracking: string
  labelUrl: string
  state: string
}

/** Crée l'expédition (order) puis récupère le suivi. Renvoie la référence Boxtal. */
export async function createShipment(
  addr: ShippingAddress,
  weightKg: number,
  operator: string,
  service: string,
  opts?: { email?: string; description?: string; value?: number }
): Promise<BoxtalShipment> {
  const today = new Date().toISOString().slice(0, 10)
  const params: Record<string, string> = {
    ...shipperParams(),
    ...recipientParams(addr, opts?.email),
    ...parcelParams(weightKg),
    ...contentParams(),
    operator,
    service,
    collection_date: today,
    'assurance.selection': 'false',
    'colis.description': (opts?.description || 'Vetements / chaussures').slice(0, 60),
  }
  if (opts?.value != null) params['colis.valeur'] = String(opts.value)

  const res = await fetch(`${API_BASE}/api/v1/order`, {
    method: 'POST',
    headers: { ...commonHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const text = await res.text()
  if (!res.ok && res.status !== 400) {
    throw new Error(`Boxtal order : HTTP ${res.status}`)
  }
  const parsed = parser.parse(text)
  checkErrors(parsed)

  const ref = String(parsed?.order?.shipment?.reference ?? '').trim()
  if (!/^[0-9a-zA-Z]{20}$/.test(ref)) {
    throw new Error("Boxtal n'a pas renvoyé de référence d'expédition valide.")
  }

  // Suivi + URL du bordereau (best-effort, ne bloque pas la création).
  let tracking = '',
    labelUrl = '',
    state = ''
  try {
    const info = await getShipmentInfo(ref)
    tracking = info.tracking
    labelUrl = info.labelUrl
    state = info.state
  } catch {
    /* les infos peuvent n'être disponibles qu'après quelques secondes */
  }

  return { ref, tracking, labelUrl, state }
}

/** Infos d'une expédition : numéro de suivi transporteur, état, URL bordereau. */
export async function getShipmentInfo(
  ref: string
): Promise<{ tracking: string; labelUrl: string; labelAvailable: boolean; state: string }> {
  const res = await fetch(`${API_BASE}/api/v1/order_status/${encodeURIComponent(ref)}/informations`, {
    headers: commonHeaders(),
  })
  const text = await res.text()
  const parsed = parser.parse(text)
  const order = parsed?.order || {}
  return {
    tracking: String(order.carrier_reference ?? ''),
    labelUrl: String(order.label_url ?? ''),
    labelAvailable: String(order.label_available ?? '') === 'true' || order.label_available === true,
    state: String(order.state ?? ''),
  }
}

/** Télécharge le bordereau (waybill) au format PDF. Renvoie les octets bruts. */
export async function getLabelPdf(ref: string): Promise<Buffer> {
  const qs = new URLSearchParams({ type: 'bordereau', envoi: ref }).toString()
  const res = await fetch(`${DOC_BASE}?${qs}`, { headers: commonHeaders() })
  if (!res.ok) throw new Error(`Boxtal bordereau : HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // Un bordereau non prêt renvoie parfois du XML d'erreur au lieu d'un PDF.
  if (buf.slice(0, 4).toString('latin1') !== '%PDF') {
    throw new Error("Le bordereau n'est pas encore disponible, réessayez dans un instant.")
  }
  return buf
}
