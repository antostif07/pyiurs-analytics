import { createClient as createSupabaseJSClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/supabase/database.types';
import { createBrowserClient } from '@supabase/ssr';

// ==========================================
// 1. CLIENT NAVIGATEUR (BROWSER) - SÉCURISÉ POUR LE CLIENT & SSR
// ==========================================
let supabaseBrowser: SupabaseClient<Database> | null = null;

export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (!supabaseBrowser) {
    // Lecture robuste des variables d'environnement compatibles Next.js / Vite / Process
    const url =
      (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : null) ||
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL || '';

    const anonKey =
      (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : null) ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';

    // En utilisant createBrowserClient, les cookies de session sont partagés automatiquement
    supabaseBrowser = createBrowserClient<Database>(url, anonKey);
  }
  return supabaseBrowser;
}

// ✅ ALIAS POUR VOTRE AUTHPROVIDER : Évite de casser vos imports existants
export const createClient = () => getSupabaseBrowser();


// ==========================================
// 2. CLIENT SERVEUR ADMIN (SERVICE ROLE) - OUTREPASSE LA RLS (SERVEUR UNIQUEMENT)
// ==========================================
let supabaseAdmin: SupabaseClient<Database> | null = null;

export function getSupabaseServer(): SupabaseClient<Database> {
  // Mesure de sécurité pour éviter de divulguer la Service Key côté client en cas d'erreur d'importation
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseServer (Admin) ne doit jamais être exécuté côté client !');
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createSupabaseJSClient<Database>(
      process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
      process.env.VITE_SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''
    );
  }
  return supabaseAdmin;
}