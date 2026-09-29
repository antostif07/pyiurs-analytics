// lib/supabase/auth-service.ts
import { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from './types'
import type { UserRole } from '@/lib/constants'
import {
  parseAssignedShopIds,
  parseAssignedCompanyIds,
} from '@/lib/auth/scope'

// Re-export pour compatibilité — délègue à @/lib/constants
export type { UserRole }

/**
 * Colonnes réellement présentes dans public.profiles.
 * Toute évolution du schéma doit être répercutée ici ET dans le type Profile.
 */
export const PROFILE_REQUIRED_FIELDS =
  'id, email, full_name, role, avatar_url, assigned_shops, assigned_companies, shop_access_type, created_at, updated_at, created_by'

export class AuthService {
  /**
   * Utilisateur actuellement authentifié (JWT vérifié côté serveur).
   */
  static async getCurrentUser(supabase: SupabaseClient) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return null
      return user
    } catch (err) {
      console.error('[AUTH_SERVICE_ERROR] getCurrentUser:', err)
      return null
    }
  }

  /**
   * Profil de l'utilisateur — retourne null si absent OU en cas d'erreur.
   */
  static async getProfile(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<Profile | null> {
    if (!userId) return null

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_REQUIRED_FIELDS)
        .eq('id', userId)
        .single()

      if (error) {
        console.warn(
          `[AUTH_SERVICE_WARNING] getProfile failed for ${userId}:`,
          error.message,
        )
        return null
      }

      // `data` est déjà typé Profile | null via le select explicite.
      // Aucun cast nécessaire.
      return data
    } catch (err) {
      console.error('[AUTH_SERVICE_ERROR] getProfile:', err)
      return null
    }
  }

  /**
   * Utilisateur + profil en un appel (SSR).
   */
  static async getCurrentUserWithProfile(supabase: SupabaseClient) {
    const user = await this.getCurrentUser(supabase)
    if (!user) return null

    const profile = await this.getProfile(supabase, user.id)
    return { user, profile }
  }

  // -------------------------------------------------------------------------
  // Shop / Company access
  // -------------------------------------------------------------------------

  /**
   * Évalue l'accès à une boutique Odoo.
   * @param shopId Odoo shop id (string numérique — ex: "1", "13")
   * ⚠️ La sentinelle "all" dans assigned_shops signifie "toutes les boutiques".
   */
  static hasShopAccess(
    profile: Partial<Profile> | null,
    shopId: string,
  ): boolean {
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (profile.shop_access_type === 'all') return true

    const assignedShops = parseAssignedShopIds(profile.assigned_shops ?? null)
    return assignedShops.includes(shopId) || assignedShops.includes('all')
  }

  /**
   * Liste brute des boutiques autorisées.
   * @returns ['all'] si accès global, sinon les odoo shop ids assignés.
   */
  static getUserShops(profile: Partial<Profile> | null): string[] {
    if (!profile) return []
    if (profile.role === 'admin' || profile.shop_access_type === 'all') {
      return ['all']
    }
    return parseAssignedShopIds(profile.assigned_shops ?? null)
  }

  /**
   * Évalue l'accès à une société Odoo.
   * @param companyId Odoo company id (number — ex: 8, 6, 3)
   */
  static hasCompanyAccess(
    profile: Partial<Profile> | null,
    companyId: number,
  ): boolean {
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (profile.shop_access_type === 'all') return true

    const assignedCompanies = parseAssignedCompanyIds(
      profile.assigned_companies ?? null,
    )
    return assignedCompanies.includes(companyId)
  }
}