import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('xxxxxxxxxxxx')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...options } as any)
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options } as any)
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: '', ...options } as any)
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options } as any)
        },
      },
    })

    const { data: { session } } = await supabase.auth.getSession()
    const isLoginPage = request.nextUrl.pathname === '/login'

    if (!session && !isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (session && isLoginPage) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } catch (err) {
    console.error('[middleware] error:', err)
    // En cas d'erreur Supabase, on laisse passer sans bloquer l'app
    return NextResponse.next()
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
