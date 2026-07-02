import { createContext, type ReactNode, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
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
  
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  
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

      // Redirection strictement typée grâce à l'étape 2
      await navigate({ to: '/', replace: true }); 
      
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
    await navigate({ to: '/login', replace: true });
    setLoading(false);
  };

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === '/login' || pathname === '/auth';

    if (user && isAuthRoute) {
      navigate({ to: '/', replace: true });
    } else if (!user && !isAuthRoute) {
      navigate({ to: '/login', replace: true });
    }
  }, [user, loading, pathname, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user && !serverProfile) {
        fetchUserProfile(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

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
        await navigate({ to: '/login', replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, serverProfile, fetchUserProfile, navigate]);

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