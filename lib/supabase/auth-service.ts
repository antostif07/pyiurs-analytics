// lib/supabase/auth-service.ts
import { createBrowserClient } from '@supabase/ssr'

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'manager' | 'financier';
  assigned_shops: string[];
  assigned_companies: string[];
  shop_access_type: 'all' | 'specific';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  private static supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  static async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error || !user) return null
    
    return user
  }

  static async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data as Profile
  }

  static async getCurrentUserWithProfile() {
    const user = await this.getCurrentUser()
    if (!user) return null

    const profile = await this.getProfile(user.id)
    return { user, profile }
  }

  // Vérifier les permissions d'accès aux boutiques
  static hasShopAccess(profile: Profile | null, shopId: string): boolean {
    if (!profile) return false
    
    // Les admins ont accès à tout
    if (profile.role === 'admin') return true
    
    // Vérifier l'accès selon le type
    if (profile.shop_access_type === 'all') return true
    
    // Vérifier les boutiques spécifiques
    return profile.assigned_shops.includes(shopId) || 
           profile.assigned_shops.includes('all')
  }

  // Obtenir la liste des boutiques accessibles
  static getUserShops(profile: Profile | null): string[] {
    if (!profile) return []
    
    if (profile.role === 'admin' || profile.shop_access_type === 'all') {
      return ['all'] // Accès à toutes les boutiques
    }
    
    return profile.assigned_shops || []
  }
}