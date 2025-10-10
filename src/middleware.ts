import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const currentUser = request.cookies.get('firebase-auth-token')?.value

  if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!currentUser) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
  }

   if (['/login', '/signup'].includes(request.nextUrl.pathname)) {
    if (currentUser) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
