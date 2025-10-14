// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

export default async function middleware(request: NextRequest) {
  const session = await getSession(request.headers.get('cookie'));

  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une route protégée
  if (!session?.isLoggedIn && !request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
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