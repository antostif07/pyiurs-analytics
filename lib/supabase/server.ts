// lib/supabase/server.ts
import { Profile } from '@/contexts/AuthContext'
import { createServerClient } from '@supabase/ssr'
import { Session, User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'

export interface ServerAuthResult {
  user: User | null
  profile: Profile | null
  session: Session | null
}

export const createClient = cache(() => {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookieStore).getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(async ({ name, value, options }) =>
              (await cookieStore).set(name, value, options)
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
  const supabase = createClient()
  
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
  const supabase = createClient()
  
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
  const supabase = createClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return { user: null, profile: null, session: null }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error getting server profile:', profileError)
      return { user: session.user, profile: null, session }
    }

    return { user: session.user, profile, session }
  } catch (error) {
    console.error('Error in getServerAuth:', error)
    return { user: null, profile: null, session: null }
  }
})