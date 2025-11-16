// middleware.ts - VERSION SIMPLIFIÉE
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Laisser passer toutes les requêtes pour le moment
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}