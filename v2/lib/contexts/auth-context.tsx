// lib/contexts/auth-context.tsx
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from '@tanstack/react-router'; // On utilise uniquement useRouter
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '../supabase/types';
import type { Database } from '../supabase/database.types';
import { createClient } from '../supabase/client';
import { AuthService } from '../services/auth-service';

// Typage strict du contexte - Zéro "any"
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Partial<Profile> | null;
  loading: boolean;
  supabase: SupabaseClient<Database>;
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
  const router = useRouter(); // Instance globale du routeur TanStack
  
  // États initiaux alimentés par le loader du serveur pour éliminer le clignotement
  const [user, setUser] = useState<User | null>(serverUser);
  const [profile, setProfile] = useState<Partial<Profile> | null>(serverProfile);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!serverUser);

  const fetchUserProfile = useCallback(async (userId: string) => {
    const fetchedProfile = await AuthService.getProfile(supabase, userId);
    setProfile(fetchedProfile);
    return fetchedProfile;
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) return { error };

      setUser(data.user);
      setSession(data.session);
      await fetchUserProfile(data.user.id);

      // On invalide le routeur pour re-déclencher les loaders avec la nouvelle session
      await router.invalidate(); 
      await router.navigate({ to: '/', replace: true }); 
      
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
    
    // Invalidation et redirection immédiate
    await router.invalidate();
    await router.navigate({ to: '/login', replace: true });
    setLoading(false);
  };

  // Écoute des événements de session et synchronisation avec le routeur
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

    // Écouteur global des changements de session (onglet dupliqué, expiration du token...)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.info(`[AUTH_STATE_CHANGE] Événement: ${event}`);
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
          // On force le routeur à rafraîchir le contexte de l'application
          await router.invalidate();
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        // En cas de déconnexion, l'invalidation va rejeter l'utilisateur de la route _authed
        await router.invalidate();
        await router.navigate({ to: '/login', replace: true });
      }
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

  // Écran d'attente de sécurité (uniquement lors du chargement initial sans SSR)
  if (loading && !serverUser) {
    return (
      <div className="relative min-h-screen bg-background text-foreground flex flex-col items-center justify-center overflow-hidden">
        {/* Arrière-plan cohérent avec le Login (grille & lueurs) */}
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-6">
          {/* Logo "P" officiel de Pyiurs avec halo de sécurité pulsé */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-white font-extrabold text-xl shadow-xl shadow-indigo-500/30">
            P
            {/* Halo d'authentification active */}
            <span className="absolute -inset-1.5 rounded-xl border border-indigo-500/30 animate-ping opacity-75 pointer-events-none" />
          </div>

          {/* En-tête et Microcopy professionnelle */}
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Pyiurs Analytics
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              Sécurisation du portail & synchronisation des flux...
            </p>
          </div>

          {/* Indicateur d'oscillation moderne à 3 points (100% natif Tailwind) */}
          <div className="flex items-center gap-1.5 pt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook d'utilisation
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

// Logique d'accès Odoo / Multi-compagnies
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