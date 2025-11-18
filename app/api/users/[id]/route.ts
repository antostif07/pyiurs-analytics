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
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
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

    // Empêcher la suppression de soi-même
    if (userId === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Supprimer l'utilisateur Auth
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)
    
    if (authDeleteError) {
      console.error('Erreur suppression auth:', authDeleteError)
      return NextResponse.json({ error: `Erreur suppression utilisateur: ${authDeleteError.message}` }, { status: 400 })
    }

    // Le profil sera automatiquement supprimé via les politiques RLS

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur API users delete:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}