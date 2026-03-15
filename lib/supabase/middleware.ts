// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// ✅ PRO: Déclaration explicite (White-listing) des routes publiques.
// C'est beaucoup plus facile à maintenir que plein de "if (!pathname.startsWith(...))"
const PUBLIC_ROUTES =['/login', '/auth', '/forgot-password', '/reset-password']

export async function updateSession(request: NextRequest) {
  // 1. Initialisation de la réponse
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Création du client Edge-compatible
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Mise à jour de la requête interceptée
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // ✅ CORRECTION CRITIQUE (Recommandation officielle Supabase) : 
          // Re-créer la réponse pour injecter les nouveaux cookies frais
          supabaseResponse = NextResponse.next({
            request,
          })
          
          // Appliquer les cookies à la réponse finale
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Vérification de l'identité (Contacte le serveur Supabase pour valider le JWT)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  // 4. Logique de Redirection (Zero Trust)
  
  // Cas A : Visiteur non connecté essayant d'accéder à une page privée
  if (!user && !isPublicRoute) {
    console.warn(`[SECURITY_BLOCK] Accès refusé à ${pathname} pour visiteur anonyme.`)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', pathname) // Sauvegarde l'URL visée
    return NextResponse.redirect(url)
  }

  // Cas B : Utilisateur déjà connecté essayant d'aller sur /login
  if (user && isPublicRoute) {
    const redirectUrl = request.nextUrl.searchParams.get('redirectedFrom') || '/'
    const url = request.nextUrl.clone()
    url.pathname = redirectUrl
    url.searchParams.delete('redirectedFrom')
    return NextResponse.redirect(url)
  }

  // Cas C : Tout est en règle, on laisse passer la requête
  return supabaseResponse
}