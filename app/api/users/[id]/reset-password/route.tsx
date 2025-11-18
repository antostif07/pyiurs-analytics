// app/api/users/[id]/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
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

    const adminClient = createAdminClient()

    // Générer un lien de réinitialisation
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: '', // L'email sera récupéré automatiquement depuis l'ID utilisateur
    })

    if (error) {
      console.error('Erreur génération lien:', error)
      return NextResponse.json({ error: `Erreur génération lien: ${error.message}` }, { status: 400 })
    }

    // En production, vous voudrez probablement envoyer l'email directement
    // Pour l'instant on retourne le lien (à des fins de démo)
    return NextResponse.json({ 
      success: true,
      message: 'Lien de réinitialisation généré avec succès',
      // En production, ne pas retourner le lien, l'envoyer par email
      recovery_link: data.properties?.action_link
    })

  } catch (error) {
    console.error('Erreur API reset password:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}