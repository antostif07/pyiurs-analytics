'use client';

import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'manager' | 'financier' | 'sales_agent';
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
  supabase: SupabaseClient;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  serverUser?: User | null;
  serverProfile?: Profile | null;
}

export function AuthProvider({ 
  children, 
  serverUser = null, 
  serverProfile = null 
}: AuthProviderProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(serverUser);
  const [profile, setProfile] = useState<Profile | null>(serverProfile);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!serverUser);
  const [profileLoading, setProfileLoading] = useState(!serverProfile);

  const fetchUserProfile = async (userId: string) => {
    setProfileLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Erreur dans fetchUserProfile:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Fonction de connexion
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Mettre à jour l'état local
      setUser(data.user);
      setSession(data.session);
      await fetchUserProfile(data.user.id);

      return { error: null };
    } catch (error) {
      console.error('Erreur inattendue lors de la connexion:', error);
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    router.push('/login');
  };

  // Gestion des redirections
  useEffect(() => {
    if (loading || profileLoading) return;

    const redirectedFrom = searchParams.get('redirectedFrom');
    
    // Si utilisateur connecté ET sur la page login → rediriger
    if (user && pathname === '/login') {
      router.push(redirectedFrom || '/');
    }
    
    // Si utilisateur NON connecté ET sur une page protégée → rediriger vers login
    else if (!user && pathname !== '/login' && pathname !== '/auth') {
      const url = `/login?redirectedFrom=${encodeURIComponent(pathname)}`;
      router.push(url);
    }
  }, [user, loading, profileLoading, pathname, searchParams, router]);

  useEffect(() => {
    // Si on a déjà les données du serveur, on peut skip l'initialisation client
    if (serverUser && serverProfile) {
      setLoading(false);
      setProfileLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("❌ Erreur lors de l'initialisation auth:", error);
        setUser(null);
        setProfile(null);
        setSession(null);
      } finally {
        console.log('🏁 Initialisation auth terminée');
        setLoading(false);
        setProfileLoading(false)
      }
    };

    initializeAuth();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      const currentUser = session?.user ?? null;
      const currentSession = session;
      
      setUser(currentUser);
      setSession(currentSession);

      if (currentUser) {
        console.log('👤 Nouvel utilisateur, récupération du profil...');
        await fetchUserProfile(currentUser.id);
      } else {
        console.log('👤 Utilisateur déconnecté');
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, serverUser, serverProfile]);

  const value = { 
    user, 
    session, 
    profile, 
    loading: loading || profileLoading,
    supabase, 
    signIn,
    signOut 
  };

  // Afficher le loader seulement pendant le chargement initial
  if ((loading || profileLoading) && !serverUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-700" />
        <span className="ml-2">Chargement...</span>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
      return ['all'];
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