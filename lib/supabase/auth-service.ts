import { SupabaseClient } from '@supabase/supabase-js';
import { Profile } from './types';

// Aligné exactement avec la contrainte SQL check : profiles_role_check
export type UserRole = 'admin' | 'user' | 'manager' | 'financier' | 'inventory-manager';

/**
 * Champs réellement existants dans la table public.profiles
 */
export const PROFILE_REQUIRED_FIELDS = 'id, email, full_name, role, avatar_url, assigned_shops, assigned_companies, shop_access_type, created_at, updated_at, created_by';

export class AuthService {

  /**
   * Récupère l'utilisateur actuellement authentifié via le JWT de session
   */
  static async getCurrentUser(supabase: SupabaseClient) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return user;
    } catch (err) {
      console.error('[AUTH_SERVICE_ERROR] Erreur lors de la récupération de l\'utilisateur:', err);
      return null;
    }
  }

  /**
   * Récupère le profil associé à l'identifiant de l'utilisateur
   */
  static async getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_REQUIRED_FIELDS)
        .eq('id', userId)
        .single();

      if (error) {
        console.warn(`[AUTH_SERVICE_WARNING] Récupération de profil échouée pour ${userId}:`, error.message);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('[AUTH_SERVICE_ERROR] Erreur système lors de la récupération du profil:', err);
      return null;
    }
  }

  /**
   * Récupère simultanément l'utilisateur et son profil (idéal pour le SSR)
   */
  static async getCurrentUserWithProfile(supabase: SupabaseClient) {
    const user = await this.getCurrentUser(supabase);
    if (!user) return null;

    const profile = await this.getProfile(supabase, user.id);
    return { user, profile };
  }

  /**
   * Parse de manière ultra-sécurisée les colonnes de type JSONB (assigned_shops, assigned_companies)
   * pour toujours retourner un tableau de chaînes de caractères.
   */
  private static safeParseJsonbArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(item => String(item));
    }

    // Si la donnée est reçue sous forme de chaîne de caractères JSON (cas rare avec PostgREST mais possible)
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item));
        }
      } catch {
        // En cas d'échec de parsing, on renvoie un tableau vide
      }
    }

    return [];
  }

  /**
   * Évalue si l'utilisateur a accès à une boutique spécifique.
   */
  static hasShopAccess(profile: Partial<Profile> | null, shopId: string): boolean {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if (profile.shop_access_type === 'all') return true;

    // Extraction sécurisée du JSONB
    const assignedShops = this.safeParseJsonbArray(profile.assigned_shops);

    return assignedShops.includes(shopId) || assignedShops.includes('all');
  }

  /**
   * Retourne la liste brute des boutiques autorisées pour l'utilisateur.
   */
  static getUserShops(profile: Partial<Profile> | null): string[] {
    if (!profile) return [];

    if (profile.role === 'admin' || profile.shop_access_type === 'all') {
      return ['all'];
    }

    // Extraction sécurisée du JSONB
    return this.safeParseJsonbArray(profile.assigned_shops);
  }
}