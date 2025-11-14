// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/supabase/auth-service'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username et password requis' },
        { status: 400 }
      )
    }

    const user = await AuthService.verifyUser(username, password)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    // Créer la session
    const response = NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        assigned_shop: user.assigned_shop
      }
    })

    // Stocker l'ID utilisateur dans un cookie sécurisé
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}