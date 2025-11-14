// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/supabase/auth-service'

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ user: null })
    }

    const user = await AuthService.getUserById(userId)
    
    if (!user) {
      // Clear invalid cookie
      const response = NextResponse.json({ user: null })
      response.cookies.set('userId', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      return response
    }

    return NextResponse.json({ 
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        assigned_shop: user.assigned_shop
      }
    })

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ user: null })
  }
}