// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export async function POST() {
  const sealedSession = await destroySession();

  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  );

  // Supprimer le cookie
  response.cookies.set('pyiurs-analytics-session', sealedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0, // Expire immédiatement
    sameSite: 'lax',
    path: '/',
  });

  return response;
}