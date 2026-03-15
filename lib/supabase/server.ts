// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { Session, User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { Profile } from './auth-service'

export interface ServerAuthResult {
  user: User | null
  profile: Profile | null
}

export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(async ({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            console.log(error);
            
          }
        },
      },
    }
  )
})

// Fonction pour récupérer l'utilisateur côté serveur
export const getServerUser = cache(async () => {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting server user:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error in getServerUser:', error)
    return null
  }
})

// Fonction pour récupérer le profil côté serveur
export const getServerProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error getting server profile:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('Error in getServerProfile:', error)
    return null
  }
})

// Fonction pour récupérer user + profile + session côté serveur
export const getServerAuth = cache(async (): Promise<ServerAuthResult> => {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { user: null, profile: null }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error getting server profile:', profileError)
      return { user: user, profile: null, }
    }

    return { user: user, profile, }
  } catch (error) {
    console.error('Error in getServerAuth:', error)
    return { user: null, profile: null }
  }
})