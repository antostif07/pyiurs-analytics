// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface UpdateUserRequest {
  email?: string
  full_name?: string
  role?: 'admin' | 'user' | 'manager' | 'financier'
  shop_access_type?: 'all' | 'specific'
  assigned_shops?: string[]
  assigned_companies?: number[]
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id: userId} = await params
    const supabase = await createClient()
    
    // Vérifier que l'utilisateur est admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier le rôle admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body: UpdateUserRequest = await request.json()

    const { 
      email,
      full_name, 
      role, 
      shop_access_type, 
      assigned_shops, 
      assigned_companies 
    } = body

    // Validation des données
    if (!full_name && !role && !shop_access_type && !assigned_shops && !assigned_companies && !email) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Mettre à jour l'email dans Auth si fourni
    if (email) {
      const { error: emailError } = await adminClient.auth.admin.updateUserById(
        userId,
        { email }
      )
      
      if (emailError) {
        console.error('Erreur mise à jour email:', emailError)
        return NextResponse.json({ error: `Erreur mise à jour email: ${emailError.message}` }, { status: 400 })
      }
    }

    // Préparer les données de mise à jour du profil
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (full_name) updateData.full_name = full_name
    if (role) updateData.role = role
    if (shop_access_type) updateData.shop_access_type = shop_access_type
    if (assigned_shops) updateData.assigned_shops = assigned_shops
    if (assigned_companies) updateData.assigned_companies = assigned_companies

    const check = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

    console.log("Check profile existence:", check);
    // Mettre à jour le profil
    const { data: profileData, error: profileUpdateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (profileUpdateError) {
      console.error('Erreur mise à jour profil:', profileUpdateError)
      return NextResponse.json({ error: `Erreur mise à jour profil: ${profileUpdateError.message}` }, { status: 400 })
    }

    return NextResponse.json(profileData)

  } catch (error) {
    console.error('Erreur API users update:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    // ✅ 1. CORRECTION CRITIQUE : Extraction correcte de la string depuis l'objet params
    const resolvedParams = await props.params;
    const targetUserId = resolvedParams.id;

    if (!targetUserId) {
      return NextResponse.json({ error: 'ID utilisateur cible manquant.' }, { status: 400 });
    }

    // Suivant la version de @supabase/ssr, createClient nécessite souvent un 'await'
    const supabase = await createClient();
    
    // 2. Identifier QUI fait la requête (l'Admin)
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !caller) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    // 3. Bloquer immédiatement la suppression de son propre compte
    // (Fait avant la requête BDD pour économiser des ressources)
    if (targetUserId === caller.id) {
      console.warn(`[SECURITY_WARNING] L'utilisateur ${caller.email} a tenté de supprimer son propre compte.`);
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 400 });
    }

    // 4. Vérifier strictement les privilèges Admin (RBAC)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.warn(`[SECURITY_ALERT] 🔴 Tentative de suppression non autorisée par: ${caller.id}`);
      return NextResponse.json({ error: 'Privilèges administrateur requis.' }, { status: 403 });
    }

    // 5. Initialiser le client Admin (Droits absolus)
    const adminClient = createAdminClient();

    // ✅ PRO: Récupérer les infos de la cible AVANT de la supprimer pour pouvoir l'écrire dans les logs
    const { data: targetUserFetch } = await adminClient.auth.admin.getUserById(targetUserId);
    const targetEmail = targetUserFetch?.user?.email || 'Email inconnu';

    if (!targetUserFetch?.user) {
      return NextResponse.json({ error: 'L\'utilisateur cible n\'existe pas ou a déjà été supprimé.' }, { status: 404 });
    }

    // 6. Suppression effective
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    
    if (authDeleteError) {
      console.error('[AUTH_ADMIN_ERROR] Erreur suppression utilisateur BDD:', authDeleteError.message);
      // ✅ PRO: Ne jamais renvoyer l'erreur brute de la BDD au client
      return NextResponse.json({ error: 'Impossible de supprimer cet utilisateur suite à un problème serveur.' }, { status: 500 });
    }

    // ✅ PRO: Audit Log Indispensable (Indique QUI a supprimé QUI)
    console.info(`[AUDIT_LOG_CRITICAL] 🗑️ L'Admin ${caller.email} (${caller.id}) a DÉFINITIVEMENT SUPPRIMÉ l'utilisateur ${targetEmail} (${targetUserId})`);

    // 7. Succès standardisé
    return NextResponse.json({ 
      success: true,
      message: 'Utilisateur supprimé avec succès.' 
    }, { status: 200 });

  } catch (error) {
    // Capture de n'importe quel crash inattendu
    console.error('[API_FATAL_ERROR] delete-user:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur. Veuillez contacter le support technique.' },
      { status: 500 }
    );
  }
}