
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware is simplified to only handle redirection for logged-in users
// trying to access login/signup pages. The protection of the /dashboard
// route will be handled client-side by checking auth state and redirecting.
export function middleware(request: NextRequest) {
  const isAuthed = Boolean(request.cookies.get('lz_auth')?.value);
  const { pathname } = request.nextUrl;

  // 1) Redirect logged-in users away from landing and auth pages
  if (isAuthed && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2) Protect dashboard and advisor for logged-out users
  if (!isAuthed && (pathname.startsWith('/dashboard') || pathname.startsWith('/advisor') || pathname.startsWith('/subscribe'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except for API, static files, and image optimization.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
