import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { getCookies, setCookie } from '@tanstack/react-start/server' // Utilisation des utilitaires officiels TanStack
import type { Database } from './database.types'
import type { Profile } from './types'

export interface ServerAuthResult {
    user: User | null
    profile: Partial<Profile> | null
}

const SUPABASE_URL =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL : '') ||
    ''

const SUPABASE_ANON_KEY =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '') ||
    ''

export const createClient = async () => {
    return createServerClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                // Utilisation de getCookies() natif de TanStack Start, ultra-robuste
                getAll() {
                    return Object.entries(getCookies()).map(([name, value]) => ({
                        name,
                        value,
                    }))
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            setCookie(name, value, options)
                        )
                    } catch (error) {
                        console.error('Erreur lors de l\'écriture du cookie:', error)
                    }
                },
            },
        }
    )
}

// Fonction pour récupérer l'utilisateur côté serveur
export const getServerUser = async () => {
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
}

// Fonction pour récupérer le profil côté serveur
export const getServerProfile = async (userId: string) => {
    const supabase = await createClient()
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId as any)
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
}

// Fonction pour récupérer user + profile côté serveur
export const getServerAuth = async (): Promise<ServerAuthResult> => {
    const supabase = await createClient()
    try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
            return { user: null, profile: null }
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id as any)
            .single()

        if (profileError) {
            console.error('Error getting server profile:', profileError)
            return { user: user, profile: null }
        }
        return { user: user, profile }
    } catch (error) {
        console.error('Error in getServerAuth:', error)
        return { user: null, profile: null }
    }
}