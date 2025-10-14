// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/users';
import { createSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username et password requis' },
        { status: 400 }
      );
    }

    const user = verifyUser(username, password);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    // Créer la session
    const sealedSession = await createSession(user.id, user.username);

    const response = NextResponse.json(
      { 
        success: true, 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name,
          role: user.role 
        } 
      },
      { status: 200 }
    );

    // Définir le cookie de session
    response.cookies.set('pyiurs-analytics-session', sealedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: 'lax',
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}