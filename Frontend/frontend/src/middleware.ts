import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  // Protect /dashboard and all its subroutes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      // Missing token! Redirect to login page
      return NextResponse.redirect(new URL('/login.html', request.url));
    }
  }

  return NextResponse.next();
}

// Config to apply middleware
export const config = {
  matcher: ['/dashboard/:path*'],
};
