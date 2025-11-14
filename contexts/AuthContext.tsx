// contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);

        // Rediriger seulement si nécessaire (éviter les boucles)
        if (event === 'SIGNED_IN' && pathname === '/login') {
          router.push('/');
          router.refresh();
        } else if (event === 'SIGNED_OUT' && pathname !== '/login') {
          router.push('/login');
          router.refresh();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]); // Ajouter pathname aux dépendances

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshSession = async () => {
    const { data: { session: newSession }, error } = await supabase.auth.getSession();
    if (!error && newSession) {
      setSession(newSession);
      setUser(newSession.user);
      await fetchProfile(newSession.user.id);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const useShopAccess = () => {
  const { profile } = useAuth();

  const hasAccessToShop = (shopId: string): boolean => {
    if (!profile) return false;
    
    // Les admins ont accès à tout
    if (profile.role === 'admin') return true;
    
    // Vérifier l'accès selon le type
    if (profile.shop_access_type === 'all') return true;
    
    // Vérifier les boutiques spécifiques
    return profile.assigned_shops.includes(shopId) || 
           profile.assigned_shops.includes('all');
  };

  const hasAccessToCompany = (companyId: string): boolean => {
    if (!profile) return false;
    
    if (profile.role === 'admin') return true;
    if (profile.shop_access_type === 'all') return true;
    
    return profile.assigned_companies.includes(companyId) ||
           profile.assigned_companies.includes('all');
  };

  const getUserShops = (): string[] => {
    if (!profile) return [];
    
    if (profile.role === 'admin' || profile.shop_access_type === 'all') {
      return ['all']; // Accès à toutes les boutiques
    }
    
    return profile.assigned_shops;
  };

  return {
    hasAccessToShop,
    hasAccessToCompany,
    getUserShops,
    isUserRestricted: profile ? profile.shop_access_type === 'specific' : true
  };
};