'use client';

import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
// ✅ PRO: Unique source de vérité (Single Source of Truth)
import { AuthService, Profile, UserRole } from '@/lib/supabase/auth-service';

// Typage strict du contexte
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  supabase: SupabaseClient;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  
  const supabase = useMemo(() => createClient(),[]);
  const router = useRouter();
  const pathname = usePathname();
  
  // États initiaux basés sur les données du serveur (Zéro flickering)
  const [user, setUser] = useState<User | null>(serverUser);
  const [profile, setProfile] = useState<Profile | null>(serverProfile);
  const [session, setSession] = useState<Session | null>(null);
  
  // Si le serveur a fourni l'utilisateur, on n'est pas en chargement !
  const[loading, setLoading] = useState(!serverUser);

  // ✅ PRO: Memoization pour éviter de recréer la fonction à chaque rendu
  const fetchUserProfile = useCallback(async (userId: string) => {
    // Utilisation de notre service métier au lieu de réécrire la requête Supabase
    const fetchedProfile = await AuthService.getProfile(supabase, userId);
    setProfile(fetchedProfile);
    return fetchedProfile;
  }, [supabase]);

  // Fonction de connexion côté client
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) return { error };

      setUser(data.user);
      setSession(data.session);
      await fetchUserProfile(data.user.id);

      // ✅ PRO: router.replace évite d'encombrer l'historique "Précédent" du navigateur
      router.replace('/'); 
      
      return { error: null };
    } catch (error) {
      console.error('[AUTH_CONTEXT] Erreur signIn:', error);
      return { error: error instanceof Error ? error : new Error('Erreur inattendue') };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    router.replace('/login');
    setLoading(false);
  };

  // ✅ PRO: Redirection client-side allégée. 
  // La VRAIE sécurité sera dans le middleware.ts. Ceci n'est qu'un fallback UX.
  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === '/login' || pathname === '/auth';

    if (user && isAuthRoute) {
      router.replace('/');
    } else if (!user && !isAuthRoute) {
      // Pas de useSearchParams ici pour ne pas casser le SSR Next.js
      router.replace('/login');
    }
  }, [user, loading, pathname, router]);

  // Écoute des événements de session (changement d'onglet, expiration du token...)
  useEffect(() => {
    // Récupération de la session initiale pour le token
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user && !serverProfile) {
        fetchUserProfile(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Écouteur global
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.info(`[AUTH_STATE_CHANGE] Événement: ${event}`);
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },[supabase, serverProfile, fetchUserProfile, router]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    supabase,
    signIn,
    signOut
  }),[user, session, profile, loading, supabase]);

  // Écran de chargement unifié
  if (loading && !serverUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-slate-500 text-sm font-medium animate-pulse">
          Authentification...
        </p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hooks personnalisés
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

// ✅ PRO: Code réutilisé depuis l'AuthService (DRY)
export const useShopAccess = () => {
  const { profile } = useAuth();

  return {
    hasAccessToShop: (shopId: string) => AuthService.hasShopAccess(profile, shopId),
    getUserShops: () => AuthService.getUserShops(profile),
    
    // Logiques spécifiques conservées
    hasAccessToCompany: (companyId: string): boolean => {
      if (!profile) return false;
      if (profile.role === 'admin' || profile.shop_access_type === 'all') return true;
      return profile.assigned_companies?.includes(companyId) || profile.assigned_companies?.includes('all');
    },
    
    isUserRestricted: profile ? profile.shop_access_type === 'specific' : true
  };
};