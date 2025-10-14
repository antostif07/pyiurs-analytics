// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { users } from '@/lib/users';

export async function GET(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie'));

  if (!session?.isLoggedIn) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = users.find(u => u.id === session.userId);
  
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Ne pas renvoyer le mot de passe
  const { ...userWithoutPassword } = user;

  return NextResponse.json({ user: userWithoutPassword });
}