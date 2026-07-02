import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/database.types';
import type { Profile } from '../supabase/types';

// Typage strict et exportation des types pour tout le projet
export type UserRole = 'admin' | 'user' | 'manager' | 'financier' | 'manager-full';

export class AuthService {
  // Injection de dépendance avec typage strict <Database> sur le client
  
  static async getCurrentUser(supabase: SupabaseClient<Database>) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  }

  static async getProfile(supabase: SupabaseClient<Database>, userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[AUTH_SERVICE_ERROR] Erreur récupération profil:', error.message)
      return null
    }

    return data as Profile
  }

  static async getCurrentUserWithProfile(supabase: SupabaseClient<Database>) {
    const user = await this.getCurrentUser(supabase)
    if (!user) return null

    const profile = await this.getProfile(supabase, user.id)
    return { user, profile }
  }

  // Logique métier isolée et pure
  static hasShopAccess(profile: Partial<Profile> | null, shopId: string): boolean {
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (profile.shop_access_type === 'all') return true
    
    return (profile.assigned_shops as string[])?.includes(shopId) || 
           (profile.assigned_shops as string[])?.includes('all') || false;
  }

  static getUserShops(profile: Partial<Profile> | null): string[] {
    if (!profile) return []
    if (profile.role === 'admin' || profile.shop_access_type === 'all') {
      return ['all']
    }
    return profile.assigned_shops as string[] || []
  }
}