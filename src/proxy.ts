import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/better-auth'

const PUBLIC_PATHS = ['/login', '/register']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const session = await auth.api.getSession({ headers: request.headers })
  const isAuthed = !!session?.user

  // Authenticated user hitting public path → redirect to owner (safe default for stub)
  if (isAuthed && PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/owner', request.url))
  }

  // Unauthenticated user hitting protected path → login
  if (!isAuthed && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/register', '/walker/:path*', '/owner/:path*'],
}
