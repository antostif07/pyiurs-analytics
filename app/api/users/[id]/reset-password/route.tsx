import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ✅ PRO: Typage strict et prise en compte des "Promises" pour les params (Next.js 15+)
interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, props: RouteProps) {
  try {
    // 1. Résolution asynchrone des paramètres (Obligatoire Next.js 15+)
    const params = await props.params;
    const targetUserId = params.id;

    if (!targetUserId) {
      return NextResponse.json({ error: 'ID utilisateur manquant' }, { status: 400 });
    }

    // 2. Authentification de l'appelant (L'administrateur qui fait la requête)
    const supabase = await createClient();
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !caller) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    // 3. Vérification stricte des droits (RBAC - Role Based Access Control)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      // ✅ PRO: Monitoring de sécurité (Alerte si quelqu'un force l'API)
      console.warn(`[SECURITY_ALERT] Tentative d'accès non autorisé au reset password par l'utilisateur: ${caller.id}`);
      return NextResponse.json({ error: 'Privilèges administrateur requis.' }, { status: 403 });
    }

    // 4. Initialisation du client Admin (Bypass le RLS)
    const adminClient = createAdminClient();

    // ✅ PRO & CORRECTION: On doit d'abord récupérer l'email de la cible via son ID
    const { data: targetUserFetch, error: userFetchError } = await adminClient.auth.admin.getUserById(targetUserId);

    if (userFetchError || !targetUserFetch.user?.email) {
      return NextResponse.json({ error: 'Utilisateur cible introuvable ou sans email valide.' }, { status: 404 });
    }

    const targetEmail = targetUserFetch.user.email;

    // 5. Génération du lien de récupération avec le VRAI email
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: targetEmail,
    });

    if (linkError) {
      console.error('[AUTH_ADMIN_ERROR] Erreur génération lien:', linkError.message);
      return NextResponse.json({ error: 'Impossible de générer le lien de réinitialisation.' }, { status: 500 });
    }

    // ✅ PRO: Audit Log. Indispensable pour la conformité (Savoir QUI a reset le mot de passe de QUI)
    console.info(`[AUDIT_LOG] Admin ${caller.email} (${caller.id}) a généré un lien de reset pour ${targetEmail} (${targetUserId})`);

    // 6. Réponse structurée
    return NextResponse.json({ 
      success: true,
      message: 'Lien de réinitialisation généré avec succès',
      data: {
        // Idéalement, ton front-end admin affichera ce lien dans une modale 
        // pour que l'admin le copie et l'envoie à l'employé sur Slack/WhatsApp.
        recoveryUrl: linkData.properties?.action_link,
        targetEmail: targetEmail
      }
    }, { status: 200 });

  } catch (error) {
    // ✅ PRO: On ne renvoie jamais l'erreur brute au client en production (sécurité)
    console.error('[API_FATAL_ERROR] reset-password:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur. Veuillez contacter le support.' },
      { status: 500 }
    );
  }
}