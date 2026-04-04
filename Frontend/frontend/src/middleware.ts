import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// Config to apply middleware
export const config = {
  matcher: ['/dashboard/:path*'],
};
