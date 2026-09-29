// @/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Database } from './database.types'
import type { Profile } from './types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ServerAuthResult {
  user: User | null
  profile: Profile | null
}

type ProfileRow = Database['public']['Tables']['profiles']['Row']

/**
 * Colonnes réellement présentes dans public.profiles.
 * Toute évolution du schéma doit être répercutée ici ET dans le type Profile.
 */
const SERVER_PROFILE_SELECT =
  'id, email, full_name, role, avatar_url, assigned_shops, assigned_companies, shop_access_type, created_at, updated_at, created_by'

// -----------------------------------------------------------------------------
// Helpers internes
// -----------------------------------------------------------------------------

/**
 * Next.js lance une erreur spéciale (digest DYNAMIC_SERVER_USAGE) quand un RSC
 * dynamique est exécuté dans un contexte statique. Elle doit être propagée.
 */
function isDynamicServerUsageError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    (error as { digest?: unknown }).digest === 'DYNAMIC_SERVER_USAGE'
  )
}

// -----------------------------------------------------------------------------
// Client Supabase (server-side)
// -----------------------------------------------------------------------------

/**
 * Client Supabase pour RSC / Route Handlers / Server Actions.
 * `cache()` évite de ré-évaluer la lecture des cookies dans la même requête.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Silencieux : se produit en RSC pur, où l'écriture cookie est interdite.
            // Le middleware.ts est responsable du refresh de session.
          }
        },
      },
    },
  )
})

// -----------------------------------------------------------------------------
// Auth helpers
// -----------------------------------------------------------------------------

/**
 * Utilisateur authentifié côté serveur (JWT vérifié cryptographiquement).
 */
export const getServerUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.warn('[SERVER_AUTH] getUser failed:', error.message)
      return null
    }

    return user
  } catch (error) {
    if (isDynamicServerUsageError(error)) throw error
    console.error('[SERVER_AUTH_ERROR] getServerUser:', error)
    return null
  }
})

/**
 * Profil utilisateur côté serveur.
 * Retourne null si le profil est absent OU si la requête échoue (les deux cas
 * sont distingués par un warn console — le consommateur traite uniformément).
 */
export const getServerProfile = cache(
  async (userId: string): Promise<Profile | null> => {
    if (!userId) return null
    const supabase = await createClient()

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(SERVER_PROFILE_SELECT)
        .eq('id', userId)
        .single()

      if (error) {
        console.warn(
          `[SERVER_AUTH] profile load failed for ${userId}:`,
          error.message,
        )
        return null
      }

      return data
    } catch (error) {
      if (isDynamicServerUsageError(error)) throw error
      console.error('[SERVER_AUTH_ERROR] getServerProfile:', error)
      return null
    }
  },
)

/**
 * Auth complète (user + profil) pour hydrater le Root Layout ou les RSC exécutifs.
 */
export const getServerAuth = cache(async (): Promise<ServerAuthResult> => {
  try {
    const user = await getServerUser()
    if (!user) return { user: null, profile: null }

    const profile = await getServerProfile(user.id)
    return { user, profile }
  } catch (error) {
    if (isDynamicServerUsageError(error)) throw error
    console.error('[SERVER_AUTH_ERROR] getServerAuth:', error)
    return { user: null, profile: null }
  }
})