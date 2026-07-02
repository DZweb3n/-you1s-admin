import { NextResponse } from 'next/server'

/**
 * Origines autorisées à appeler l'API de paiement (le site public).
 * Ajoute ici tout domaine depuis lequel le checkout est déclenché.
 */
const ALLOWED_ORIGINS = [
  'https://you-1s.com',
  'https://www.you-1s.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
]

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

/** Réponse JSON avec en-têtes CORS. */
export function jsonCors(
  body: unknown,
  origin: string | null,
  status = 200
): NextResponse {
  return NextResponse.json(body, { status, headers: corsHeaders(origin) })
}

/** Réponse au preflight OPTIONS. */
export function preflight(origin: string | null): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}
