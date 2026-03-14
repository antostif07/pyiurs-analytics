// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ✅ PRO: Supabase requiert un email (pas un username custom)
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis.' },
        { status: 400 }
      );
    }

    // Le createClient serveur de @supabase/ssr va AUTOMATIQUEMENT
    // générer et attacher les cookies sécurisés à la réponse Next.js
    const supabase = createClient();

    // 1. Authentification via Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.warn(`[AUTH_FAILED] Tentative de connexion échouée pour: ${email}`);
      return NextResponse.json(
        { error: 'Identifiants invalides.' },
        { status: 401 }
      );
    }

    // 2. Récupération du profil associé (pour renvoyer les droits d'accès au front)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, assigned_shops, assigned_companies, shop_access_type')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error(`[AUTH_PROFILE_ERROR] Impossible de charger le profil de: ${authData.user.id}`);
      // On ne bloque pas la connexion, mais on renvoie des infos de base
    }

    // ✅ PRO: Audit Log de connexion
    console.info(`[AUDIT_LOG] 🟢 Connexion réussie: ${email} (${profile?.role || 'user'})`);

    // 3. Réponse propre. Pas besoin de .cookies.set(), Supabase l'a déjà fait !
    return NextResponse.json({ 
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.full_name,
        role: profile?.role,
        assigned_shops: profile?.assigned_shops ||[],
        shop_access_type: profile?.shop_access_type || 'specific'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[API_FATAL_ERROR] auth/login:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}