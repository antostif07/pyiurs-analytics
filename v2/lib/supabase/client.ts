import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseJSClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let supabaseBrowser: SupabaseClient<Database> | null = null;

export function getSupabaseBrowser(): SupabaseClient<Database> {
    if (!supabaseBrowser) {
        const url =
            (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : null) ||
            process.env.VITE_SUPABASE_URL ||
            process.env.VITE_PUBLIC_SUPABASE_URL || '';

        const anonKey =
            (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : null) ||
            process.env.VITE_SUPABASE_ANON_KEY ||
            process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';

        supabaseBrowser = createBrowserClient<Database>(url, anonKey);
    }
    return supabaseBrowser;
}

// Typage strict de l'export createClient
export const createClient = (): SupabaseClient<Database> => getSupabaseBrowser();

let supabaseAdmin: SupabaseClient<Database> | null = null;

export function getSupabaseServer(): SupabaseClient<Database> {
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