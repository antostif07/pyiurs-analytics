// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { users, hasPermission } from '@/lib/users';

export async function middleware(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie'));

  if (!session?.isLoggedIn && !request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Vérifier les permissions si l'utilisateur est connecté
  if (session?.isLoggedIn) {
    const user = users.find(u => u.id === session.userId);
    
    if (user && !hasPermission(user, request.nextUrl.pathname)) {
      // Rediriger vers la page d'accueil si pas la permission
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/manager-kpis/:path*',
    '/control-revenue-beauty/:path*',
    '/control-stock-beauty/:path*',
    '/control-stock-femme/:path*',
    '/client-base/:path*',
    '/client-base-beauty/:path*',
    '/parc-client/:path*',
  ],
};