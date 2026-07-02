import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/login'

  // Check Supabase auth cookie directly — no network call, no possible hang
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

  if (!hasSession && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  /* api/ exclu : les routes API gèrent leur propre sécurité
     (webhook = signature Stripe, checkout = validation serveur + CORS) */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
