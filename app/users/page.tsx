// app/users/page.tsx
import { redirect } from "next/navigation";
import { createClient, getServerAuth } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import UsersClient, { EnhancedUser } from "./users.client";
import { POSConfig } from "../types/pos";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    page?: string;
  }>;
}

async function getEnhancedUsers(search?: string, role?: string): Promise<EnhancedUser[]> {
  // Vérifier que l'utilisateur connecté est admin
  const { user, profile } = await getServerAuth();
  
  if (!user || profile?.role !== 'admin') {
    console.log('❌ Accès refusé - Rôle:', profile?.role);
    redirect('/');
  }

  console.log('✅ Accès admin autorisé, récupération des utilisateurs...');

  try {
    // Récupérer les profiles
    const supabase = createClient();
    let profileQuery = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (search && search.trim() !== '') {
      profileQuery = profileQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role && role !== 'all') {
      profileQuery = profileQuery.eq('role', role);
    }

    const { data: profiles, error: profileError } = await profileQuery;

    if (profileError) {
      throw new Error(`Erreur profiles: ${profileError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Récupérer les données auth avec l'admin client
    const adminClient = createAdminClient();
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();

    if (authError) {
      console.error('Erreur auth users:', authError);
      // Retourner seulement les profiles si erreur sur auth
      return profiles.map(profile => ({
        ...profile,
        last_sign_in_at: undefined,
        created_at_auth: undefined,
        email_confirmed_at: undefined,
        is_online: false,
        phone: undefined
      }));
    }

    // Fusionner les données
    const enhancedUsers = profiles.map(profile => {
      const authUser = authUsers.users.find(authUser => authUser.id === profile.id);
      
      return {
        ...profile,
        last_sign_in_at: authUser?.last_sign_in_at || undefined,
        created_at_auth: authUser?.created_at || undefined,
        email_confirmed_at: authUser?.email_confirmed_at || undefined,
        is_online: authUser?.last_sign_in_at ? 
          (new Date(authUser.last_sign_in_at).getTime() > Date.now() - 15 * 60 * 1000) : false,
        phone: authUser?.phone || undefined
      };
    });

    console.log(`✅ ${enhancedUsers.length} utilisateurs enrichis récupérés`);
    return enhancedUsers;

  } catch (error) {
    console.error('❌ Erreur dans getEnhancedUsers:', error);
    throw error;
  }
}

async function getPOSConfig(): Promise<{records: POSConfig[]}> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name`,
      { 
        next: { revalidate: 3600 }
      }
    );
    
    if (!res.ok) {
      throw new Error(`Erreur API: ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Erreur getPOSConfig:', error);
    return { records: [] };
  }
}

async function getCompanies() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/res.company?fields=id,name`,
      { 
        next: { revalidate: 3600 }
      }
    );
    
    if (!res.ok) {
      throw new Error(`Erreur API: ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Erreur getPOSConfig:', error);
    return { records: [] };
  }
}

export default async function UsersPage({ searchParams }: PageProps) {
  // Vérifier l'authentification et les permissions
  const { user, profile } = await getServerAuth();
  
  if (!user) {
    redirect('/login');
  }
  
  if (profile?.role !== 'admin') {
    console.log('Accès refusé à /users - Rôle:', profile?.role);
    redirect('/');
  }

  const params = await searchParams;
  const search = params.search || undefined;
  const role = params.role || undefined;

  try {
    const [users, shops, companies] = await Promise.all([
      getEnhancedUsers(search, role),
      getPOSConfig(),
      getCompanies()
    ]);

    return (
      <UsersClient
        initialUsers={users}
        shops={shops.records}
        companies={companies.records}
        search={search}
        roleFilter={role}
      />
    );
  } catch (error) {
    console.error('❌ Erreur dans UsersPage:', error);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Erreur
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement des utilisateurs'}
          </p>
        </div>
      </div>
    );
  }
}