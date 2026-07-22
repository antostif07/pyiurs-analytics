'use client';

import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { AuthService } from '@/lib/supabase/auth-service';
import { Profile } from '@/lib/supabase/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Partial<Profile> | null;
  loading: boolean;
  supabase: SupabaseClient;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  serverUser?: User | null;
  serverProfile?: Partial<Profile> | null;
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

  const hasHydrated = useRef(false);

  const [user, setUser] = useState<User | null>(serverUser);
  const [profile, setProfile] = useState<Partial<Profile> | null>(serverProfile);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!serverUser);

  // ✅ SOLUTION DU STALE CLOSURE : Utilisation d'un Ref pour stocker le profil actif
  const profileRef = useRef<Partial<Profile> | null>(serverProfile);

  // Synchronisation systématique du Ref avec l'état React de profil
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Récupération du profil
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const fetchedProfile = await AuthService.getProfile(supabase, userId);
      setProfile(fetchedProfile);
      return fetchedProfile;
    } catch (error) {
      console.error('[AUTH_CONTEXT_ERROR] Erreur récupération profil:', error);
      return null;
    }
  }, [supabase]);

  // Connexion
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setLoading(false);
        return { error };
      }

      setUser(data.user);
      setSession(data.session);
      await fetchUserProfile(data.user.id);
      setLoading(false);

      const redirectTo = searchParams?.get('next') || '/';
      router.replace(redirectTo);

      return { error: null };
    } catch (error) {
      console.error('[AUTH_CONTEXT_ERROR] Erreur critique signIn:', error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error('Erreur inattendue') };
    }
  };

  // Déconnexion
  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      router.replace('/login');
    } catch (error) {
      console.error('[AUTH_CONTEXT_ERROR] Erreur lors du signOut:', error);
    } finally {
      setLoading(false);
    }
  };

  // Redirections automatiques UX Client (Secours du Middleware.ts)
  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === '/login' || pathname === '/auth';

    if (user && isAuthRoute) {
      const redirectTo = searchParams?.get('next') || '/';
      router.replace(redirectTo);
    } else if (!user && !isAuthRoute) {
      const query = pathname !== '/' ? `?next=${encodeURIComponent(pathname + (searchParams?.toString() ? '?' + searchParams.toString() : ''))}` : '';
      router.replace(`/login${query}`);
    }
  }, [user, loading, pathname, router, searchParams]);

  // Écouteur global réactif unique
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.info(`[AUTH_EVENT] Événement réactif: ${event}`);

      setSession(currentSession);
      const sessionUser = currentSession?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        // ✅ STRATÉGIE LUXE : On vérifie via notre 'profileRef' si l'utilisateur en mémoire a changé.
        // Si c'est le même utilisateur (ex: simple rafraîchissement de jeton au retour d'onglet),
        // on ne touche à rien, on n'affiche aucun loader et on n'exécute aucune requête SQL inutile vers Supabase.
        const isNewUser = !profileRef.current || profileRef.current.id !== sessionUser.id;

        if (isNewUser) {
          setLoading(true);
          if (serverProfile && serverProfile.id === sessionUser.id && !hasHydrated.current) {
            setProfile(serverProfile);
          } else {
            await fetchUserProfile(sessionUser.id);
          }
          setLoading(false);
        } else {
          // L'utilisateur est identique, on s'assure juste que le loader reste inactif
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);

        if (event === 'SIGNED_OUT') {
          router.replace('/login');
        }
      }

      hasHydrated.current = true;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, serverProfile, fetchUserProfile, router]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    supabase,
    signIn,
    signOut
  }), [user, session, profile, loading, supabase]);

  if (loading && !serverUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center transition-colors duration-150">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary stroke-[1.5]" />
          <p className="text-muted-foreground text-xs font-light tracking-widest uppercase animate-pulse">
            Vérification de l'accès
          </p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

export const useShopAccess = () => {
  const { profile } = useAuth();

  return {
    hasAccessToShop: (shopId: string) => AuthService.hasShopAccess(profile, shopId),
    getUserShops: () => AuthService.getUserShops(profile),

    hasAccessToCompany: (companyId: string): boolean => {
      if (!profile) return false;
      if (profile.role === 'admin' || profile.shop_access_type === 'all') return true;
      return (profile.assigned_companies as string[])?.includes(companyId) || (profile.assigned_companies as string[])?.includes('all');
    },

    isUserRestricted: profile ? profile.shop_access_type === 'specific' : true
  };
};