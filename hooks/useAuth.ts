// hooks/useAuth.ts
"use client";

import { User } from '@/lib/users';
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
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

  // Nouvelle méthode pour vérifier les rôles
  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  // Nouvelle méthode pour obtenir les shops attribués
  const getAssignedShops = (): string[] => {
    if (!user) return [];
    
    if (user.assignedShop === 'all') {
      return ['all']; // Accès à tous les shops
    }
    
    return user.assignedShop || [];
  };

  // Vérifier si l'utilisateur a accès à un shop spécifique
  const hasShopAccess = (shopId: string): boolean => {
    if (!user) return false;
    
    if (user.assignedShop === 'all') {
      return true;
    }
    
    return user.assignedShop?.includes(shopId) || false;
  };

  // Vérifier si l'utilisateur est limité à des shops spécifiques
  const isShopRestricted = (): boolean => {
    if (!user) return true;
    
    return user.assignedShop !== 'all' && (user.assignedShop?.length || 0) > 0;
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