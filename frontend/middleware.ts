import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const dest = request.headers.get('sec-fetch-dest');
  const acceptHeader = request.headers.get('Accept');
  const pathname = request.nextUrl.pathname;
  
  // When Next injects CSS files with <script> tags, respond with harmless JS so the browser
  // does not attempt to execute the CSS bundle and raise a SyntaxError.
  if (dest === 'script' || (acceptHeader && acceptHeader.includes('application/javascript'))) {
    console.warn(`[Middleware] Blocking CSS as script for: ${pathname}`);
    console.warn(`[Middleware] sec-fetch-dest: ${dest}, Accept: ${acceptHeader}`);
    
    return new NextResponse('/* Ignoring CSS script load */', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Middleware-Intercept': 'true',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/_next/static/css/:path*',
    '/_next/static/chunks/:path*',
    '/((?!api|_next/image|favicon.ico).*)',
  ],
};

