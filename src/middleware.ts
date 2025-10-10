
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware is simplified to only handle redirection for logged-in users
// trying to access login/signup pages. The protection of the /dashboard
// route will be handled client-side by checking auth state and redirecting.
export function middleware(request: NextRequest) {
  // NOTE: The Firebase client SDK manages auth state on the client, often in localStorage.
  // Directly checking for a specific auth cookie on the server via middleware is unreliable
  // for determining a user's logged-in status with Firebase client auth.
  // We'll let client-side checks in a layout or provider handle protected routes.

  const currentUser = request.cookies.get('firebase-auth-token')?.value; // This cookie might not be reliably set by the client SDK

   if (['/login', '/signup'].includes(request.nextUrl.pathname)) {
    if (currentUser) {
      // If a user has an auth token, they shouldn't be on the login/signup page.
      // Redirect them to the dashboard.
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except for API, static files, and image optimization.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
