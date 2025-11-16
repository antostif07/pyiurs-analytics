// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Si pas d'utilisateur ET pas sur une route publique, rediriger vers login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Si utilisateur connecté ET sur login, rediriger vers l'accueil ou la page d'origine
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const redirectUrl = request.nextUrl.searchParams.get('redirectedFrom') || '/'
    const url = request.nextUrl.clone()
    url.pathname = redirectUrl
    url.searchParams.delete('redirectedFrom')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}