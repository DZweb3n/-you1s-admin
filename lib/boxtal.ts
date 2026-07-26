import { XMLParser } from 'fast-xml-parser'

/**
 * Client Boxtal (API v1 « envoimoinscher ») — SERVEUR UNIQUEMENT.
 * Conforme à la spécification OpenAPI officielle (paramètres en FRANÇAIS :
 * expediteur.*, destinataire.*, code_contenu, collecte…).
 * Flux : GET /cotation (offres) → POST /order (référence + URL bordereau).
 * Le suivi arrive ensuite via le callback url_push (/api/boxtal/push).
 *
 * Voir BOXTAL-SETUP.md pour la configuration (compte + variables d'env).
 */

const ENV = (process.env.BOXTAL_ENV || 'test').toLowerCase()
const IS_PROD = ENV === 'prod' || ENV === 'production'

const API_BASE = IS_PROD
  ? 'https://www.envoimoinscher.com/api/v1'
  : 'https://test.envoimoinscher.com/api/v1'

/* Serveur des bordereaux (fallback si l'URL fournie par Boxtal manque). */
const DOC_BASE =
  process.env.BOXTAL_DOC_SERVER ||
  (IS_PROD
    ? 'https://www.envoimoinscher.com/documents'
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
  return { Authorization: authHeader(), 'Accept-Language': 'fr-FR' }
}

function senderType(): 'entreprise' | 'particulier' {
  const t = (process.env.BOXTAL_SENDER_TYPE || 'entreprise').toLowerCase()
  return t === 'particulier' || t === 'individual' ? 'particulier' : 'entreprise'
}

/* Expéditeur (la boutique) — paramètres français `expediteur.*`. */
function expediteurParams(): Record<string, string> {
  const p: Record<string, string> = {
    'expediteur.pays': process.env.BOXTAL_SENDER_COUNTRY || 'FR',
    'expediteur.code_postal': process.env.BOXTAL_SENDER_ZIP || '',
    'expediteur.ville': process.env.BOXTAL_SENDER_CITY || '',
    'expediteur.adresse': process.env.BOXTAL_SENDER_ADDRESS || '',
    'expediteur.type': senderType(),
    'expediteur.prenom': process.env.BOXTAL_SENDER_FIRSTNAME || '',
    'expediteur.nom': process.env.BOXTAL_SENDER_LASTNAME || '',
    'expediteur.email': process.env.BOXTAL_SENDER_EMAIL || '',
    'expediteur.tel': (process.env.BOXTAL_SENDER_PHONE || '').replace(/\s+/g, ''),
  }
  if (process.env.BOXTAL_SENDER_COMPANY) p['expediteur.societe'] = process.env.BOXTAL_SENDER_COMPANY
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

/* Destinataire — paramètres français `destinataire.*` (à partir de la commande). */
function destinataireParams(addr: ShippingAddress, email?: string): Record<string, string> {
  const full = String(addr.name || '').trim()
  const parts = full.split(/\s+/)
  const prenom = parts.length > 1 ? parts.slice(0, -1).join(' ') : full || 'Client'
  const nom = parts.length > 1 ? parts[parts.length - 1] : full || 'Client'
  return {
    'destinataire.pays': (addr.country || 'FR').toUpperCase(),
    'destinataire.code_postal': addr.zip || '',
    'destinataire.ville': addr.city || '',
    'destinataire.adresse': addr.address || '',
    'destinataire.type': 'particulier',
    'destinataire.prenom': prenom,
    'destinataire.nom': nom,
    'destinataire.email': email || process.env.BOXTAL_SENDER_EMAIL || '',
    'destinataire.tel': (addr.phone || '0600000000').replace(/\s+/g, ''),
  }
}

/* Colis : poids (kg) + dimensions par défaut (cm). Un seul colis (colis_1). */
function colisParams(weightKg: number): Record<string, string> {
  const w = Math.max(0.1, Number(weightKg) || Number(process.env.BOXTAL_DEFAULT_WEIGHT) || 2)
  return {
    'colis_1.poids': String(w),
    'colis_1.longueur': process.env.BOXTAL_PARCEL_L || '35',
    'colis_1.largeur': process.env.BOXTAL_PARCEL_W || '25',
    'colis_1.hauteur': process.env.BOXTAL_PARCEL_H || '15',
  }
}

function codeContenu(): string {
  return process.env.BOXTAL_CONTENT_CODE || '10120'
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
  // Boxtal renvoie <error><code/><message/></error> en cas de refus (400/401).
  const err = parsed?.error
  if (err) {
    const msg = err?.message || (typeof err === 'string' ? err : 'Requête Boxtal refusée')
    throw new Error(String(msg))
  }
}

/** Cotation : offres transporteurs en LIVRAISON À DOMICILE (relais exclus). */
export async function getQuotes(
  addr: ShippingAddress,
  weightKg: number,
  email?: string
): Promise<BoxtalOffer[]> {
  const params = {
    ...expediteurParams(),
    ...destinataireParams(addr, email),
    ...colisParams(weightKg),
    code_contenu: codeContenu(),
  }
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}/cotation?${qs}`, { headers: commonHeaders() })
  const text = await res.text()
  if (!res.ok && res.status !== 400 && res.status !== 401) {
    throw new Error(`Boxtal cotation : HTTP ${res.status}`)
  }
  const parsed = parser.parse(text)
  checkErrors(parsed)

  const offers = asArray<any>(parsed?.cotation?.shipment?.offer)
  const out: BoxtalOffer[] = []
  for (const o of offers) {
    // On écarte les offres qui exigent un point relais (dépôt/retrait) —
    // le checkout ne collecte qu'une adresse domicile.
    const mand = asArray<any>(o?.mandatory_information?.parameter ?? o?.mandatory_information)
    const needsRelay = mand.some((m) => String(m?.code || '').toLowerCase().includes('pointrelais'))
    const deliveryCode = String(o?.delivery?.type?.code || '')
    if (needsRelay || deliveryCode === 'PICKUP_POINT') continue

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
  out.sort((a, b) => a.priceTTC - b.priceTTC)
  return out
}

/** Résultat d'une création d'expédition. */
export type BoxtalShipment = {
  ref: string
  labelUrl: string
}

/** Crée l'expédition (POST /order). Renvoie la référence + l'URL du bordereau. */
export async function createShipment(
  addr: ShippingAddress,
  weightKg: number,
  operator: string,
  service: string,
  opts?: { email?: string; description?: string; value?: number; pushUrl?: string }
): Promise<BoxtalShipment> {
  const today = new Date().toISOString().slice(0, 10)
  const params: Record<string, string> = {
    ...expediteurParams(),
    ...destinataireParams(addr, opts?.email),
    ...colisParams(weightKg),
    code_contenu: codeContenu(),
    operator,
    service,
    collecte: today,
    'colis.description': (opts?.description || 'Vetements / chaussures').slice(0, 60),
    url_push: opts?.pushUrl || 'https://you-1s.com/api/boxtal/push',
    'assurance.selection': 'false',
  }
  if (opts?.value != null) params['colis.valeur'] = String(opts.value)

  const res = await fetch(`${API_BASE}/order`, {
    method: 'POST',
    headers: { ...commonHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const text = await res.text()
  if (!res.ok && res.status !== 400 && res.status !== 401) {
    throw new Error(`Boxtal order : HTTP ${res.status}`)
  }
  const parsed = parser.parse(text)
  checkErrors(parsed)

  const shipment = parsed?.order?.shipment || {}
  const ref = String(shipment.reference ?? '').trim()
  if (!/^[0-9a-zA-Z]{20}$/.test(ref)) {
    throw new Error("Boxtal n'a pas renvoyé de référence d'expédition valide.")
  }
  const labelUrl = String(asArray<any>(shipment.labels?.label)[0] ?? '')

  return { ref, labelUrl }
}

/** Télécharge le bordereau (PDF). Utilise l'URL Boxtal si fournie, sinon reconstruit. */
export async function getLabelPdf(ref: string, labelUrl?: string): Promise<Buffer> {
  const url =
    labelUrl && /^https?:\/\//i.test(labelUrl)
      ? labelUrl
      : `${DOC_BASE}?${new URLSearchParams({ type: 'bordereau', envoi: ref }).toString()}`
  const res = await fetch(url, { headers: commonHeaders() })
  if (!res.ok) throw new Error(`Boxtal bordereau : HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // Un bordereau non prêt renvoie parfois du XML d'erreur au lieu d'un PDF.
  if (buf.slice(0, 4).toString('latin1') !== '%PDF') {
    throw new Error("Le bordereau n'est pas encore disponible, réessayez dans un instant.")
  }
  return buf
}
