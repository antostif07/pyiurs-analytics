// hooks/useAuth.ts
"use client";

import { UserWithPermissions } from '@/lib/users';
import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/supabase/auth-service';
import { ModuleService } from '@/lib/supabase/module-service';

export function useAuth() {
  const [user, setUser] = useState<UserWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        await checkAuth();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const hasPermission = (path: string): boolean => {
    if (!user) return false;
    
    if (user.permissions.includes('all')) {
      return true;
    }
    
    return user.permissions.includes(path);
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const getAssignedShops = (): string[] => {
    if (!user) return [];
    
    if (user.assigned_shop === 'all') {
      return ['all'];
    }
    
    return Array.isArray(user.assigned_shop) ? user.assigned_shop : [];
  };

  const hasShopAccess = (shopId: string): boolean => {
    if (!user) return false;
    
    if (user.assigned_shop === 'all') {
      return true;
    }
    
    return Array.isArray(user.assigned_shop) 
      ? user.assigned_shop.includes(shopId)
      : false;
  };

  const isShopRestricted = (): boolean => {
    if (!user) return true;
    
    return user.assigned_shop !== 'all' && 
           Array.isArray(user.assigned_shop) && 
           user.assigned_shop.length > 0;
  };

  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission,
    hasRole,
    getAssignedShops,
    hasShopAccess,
    isShopRestricted,
  };
}