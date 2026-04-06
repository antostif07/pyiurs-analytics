// hooks/useShopPermissions.ts
import { useAuth } from '@/contexts/AuthContext';

export function useShopPermissions() {
  const { profile } = useAuth();

  const hasShopAccess = (shopId: string): boolean => {
    if (!profile) return false;
    
    // Admins ont tout accès
    if (profile.role === 'admin') return true;
    
    // Vérifier le type d'accès
    if (profile.shop_access_type === 'all') return true;
    
    const assignedShops = (profile.assigned_shops as string[]) || [];
    // Vérifier les boutiques spécifiques
    return assignedShops.includes(shopId) || 
           assignedShops.includes('all');
  };

  const getUserShops = (): string[] => {
    if (!profile) return [];
    
    if (profile.role === 'admin' || profile.shop_access_type === 'all') {
      return ['all'];
    }
    
    return (profile.assigned_shops as string[]) || [];
  };

  const canManageShop = (shopId: string): boolean => {
    if (!profile) return false;
    
    // Seuls les managers et admins peuvent gérer
    if (profile.role && !['admin', 'manager'].includes(profile.role)) return false;
    
    return hasShopAccess(shopId);
  };

  return {
    hasShopAccess,
    getUserShops,
    canManageShop,
    isUserRestricted: profile ? profile.shop_access_type === 'specific' : true,
    userRole: profile?.role || 'user'
  };
}