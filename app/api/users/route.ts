// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface CreateUserRequest {
  email: string
  password?: string
  full_name: string
  role: 'admin' | 'user' | 'manager' | 'financier'
  shop_access_type: 'all' | 'specific'
  assigned_shops: string[]
  assigned_companies: number[]
  send_invitation: boolean
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient()
    
    // Vérifier que l'utilisateur est authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' }, 
        { status: 401 }
      )
    }

    // Vérifier le rôle admin avec une requête plus robuste
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Erreur récupération profil:', profileError)
      return NextResponse.json(
        { error: 'Erreur de vérification des permissions' }, 
        { status: 500 }
      )
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès non autorisé. Rôle admin requis.' }, 
        { status: 403 }
      )
    }

    const body: CreateUserRequest = await request.json()
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
      return NextResponse.json(
        { error: 'Email, nom complet et rôle sont requis' }, 
        { status: 400 }
      )
    }

    if (!send_invitation && !password) {
      return NextResponse.json(
        { error: 'Mot de passe requis quand l\'invitation n\'est pas envoyée' }, 
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 🔥 OPTION 1: Utiliser le service admin pour contourner RLS
    let authUser
    
    if (send_invitation) {
      // Envoyer une invitation
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name }
      })
      
      if (error) {
        console.error('Erreur invitation:', error)
        return NextResponse.json(
          { error: `Erreur d'invitation: ${error.message}` }, 
          { status: 400 }
        )
      }
      
      authUser = data.user
    } else {
      // Créer avec mot de passe
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password: password!,
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (error) {
        console.error('Erreur création user:', error)
        return NextResponse.json(
          { error: `Erreur de création: ${error.message}` }, 
          { status: 400 }
        )
      }
      
      authUser = data.user
    }

    if (!authUser) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'utilisateur Auth' }, 
        { status: 500 }
      )
    }

    // 🔥 OPTION 2: Utiliser le client admin pour insérer le profil
    const { data: profileData, error: profileCreateError } = await adminClient
      .from('profiles')
      .insert({
        id: authUser.id,
        email: authUser.email!,
        full_name,
        role,
        shop_access_type,
        assigned_shops: assigned_shops || [],
        assigned_companies: assigned_companies || [],
        created_by: user.id // Track qui a créé l'utilisateur
      })
      .select(`
        id,
        email,
        full_name,
        role,
        shop_access_type,
        assigned_shops,
        assigned_companies,
        created_at
      `)
      .single()

    if (profileCreateError) {
      console.error('Erreur création profil:', profileCreateError)
      
      // Rollback: supprimer l'utilisateur auth si le profil échoue
      try {
        await adminClient.auth.admin.deleteUser(authUser.id)
      } catch (deleteError) {
        console.error('Erreur lors du rollback:', deleteError)
      }
      
      return NextResponse.json(
        { error: `Erreur création profil: ${profileCreateError.message}` }, 
        { status: 400 }
      )
    }

    console.log('✅ Utilisateur créé avec succès:', profileData.id)

    return NextResponse.json(profileData)

  } catch (error: unknown) {
    console.error('Erreur API users:', error)
    const errorMessage: string = error instanceof Error ? error.message : 'Erreur interne du serveur'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}