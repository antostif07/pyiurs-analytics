"use server"

import { createServerClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { Database } from './database.types'
import { Profile } from './types'

export interface ServerAuthResult {
  user: User | null
  profile: Partial<Profile> | null
}

/**
 * Liste des champs réellement présents dans la table public.profiles
 */
const SERVER_PROFILE_SELECT = 'id, email, full_name, role, avatar_url, assigned_shops, assigned_companies, shop_access_type, created_at, updated_at, created_by';

/**
 * Crée un client Supabase Server optimisé pour Next.js App Router (RSC, Route Handlers, Server Actions).
 * Enveloppé dans `cache()` de React pour éviter d'analyser les cookies à chaque appel.
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
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // Cette erreur est attendue et ignorée uniquement si l'appel a lieu au sein d'un Server Component (RSC).
            // Le middleware global (middleware.ts) doit obligatoirement prendre le relais pour rafraîchir la session.
          }
        },
      },
    }
  )
})

/**
 * Récupère de manière sécurisée l'utilisateur côté serveur (vérification cryptographique du JWT).
 */
export const getServerUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.warn('[SERVER_AUTH] Impossible de récupérer l\'utilisateur:', error.message)
      return null
    }

    return user
  } catch (error) {
    if (error && typeof error === 'object' && (error as any).digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    console.error('[SERVER_AUTH_ERROR] Erreur critique dans getServerUser:', error)
    return null
  }
})

/**
 * Récupère le profil de l'utilisateur côté serveur.
 */
export const getServerProfile = cache(async (userId: string): Promise<Profile | null> => {
  if (!userId) return null;
  const supabase = await createClient()

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(SERVER_PROFILE_SELECT)
      .eq('id', userId)
      .single()

    if (error) {
      console.warn(`[SERVER_AUTH] Impossible de charger le profil pour l'utilisateur ${userId}:`, error.message)
      return null
    }

    return profile as Profile
  } catch (error) {
    if (error && typeof error === 'object' && (error as any).digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    console.error('[SERVER_AUTH_ERROR] Erreur critique dans getServerProfile:', error)
    return null
  }
})

/**
 * Récupère conjointement l'utilisateur et son profil.
 * Idéal pour hydrater l'AuthProvider client à l'initialisation du Root Layout.
 */
export const getServerAuth = cache(async (): Promise<ServerAuthResult> => {
  try {
    const user = await getServerUser()

    if (!user) {
      return { user: null, profile: null }
    }

    const profile = await getServerProfile(user.id)

    return { user, profile }
  } catch (error) {
    if (error && typeof error === 'object' && (error as any).digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    console.error('[SERVER_AUTH_ERROR] Erreur critique dans getServerAuth:', error)
    return { user: null, profile: null }
  }
})