// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
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

    const body = await request.json()
    const { 
      email, 
      password, 
      full_name, 
      role, 
      shop_access_type, 
      assigned_shops, 
      assigned_companies,
      send_invitation 
    } = body

    // Validation des données
    if (!email || !full_name || !role) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Créer l'utilisateur dans l'auth
    let authUser
    if (send_invitation) {
      // Envoyer une invitation
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name }
      })
      
      if (error) {
        console.error('Erreur invitation:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      authUser = data.user
    } else {
      // Créer avec mot de passe
      if (!password) {
        return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 })
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Confirmer l'email automatiquement
        user_metadata: { full_name }
      })

      if (error) {
        console.error('Erreur création user:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      authUser = data.user
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Erreur lors de la création de l\'utilisateur' }, { status: 500 })
    }

    // Créer le profil
    const { data: profileData, error: profileCreateError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        email: authUser.email!,
        full_name,
        role,
        shop_access_type,
        assigned_shops: assigned_shops || [],
        assigned_companies: assigned_companies || []
      })
      .select()
      .single()

    if (profileCreateError) {
      console.error('Erreur création profil:', profileCreateError)
      
      // Rollback: supprimer l'utilisateur auth si le profil échoue
      await adminClient.auth.admin.deleteUser(authUser.id)
      
      return NextResponse.json({ error: profileCreateError.message }, { status: 400 })
    }

    return NextResponse.json(profileData)

  } catch (error) {
    console.error('Erreur API users:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}