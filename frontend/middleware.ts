import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const dest = request.headers.get('sec-fetch-dest');
  const acceptHeader = request.headers.get('Accept');
  
  // Intercept CSS files being loaded as scripts
  if (pathname.endsWith('.css')) {
    // If the request is coming from a script tag, return empty JavaScript
    if (dest === 'script' || (acceptHeader && acceptHeader.includes('application/javascript'))) {
      console.warn(`[Middleware] ⚠️ Blocking CSS-as-script: ${pathname}`);
      console.warn(`[Middleware] sec-fetch-dest: ${dest}, Accept: ${acceptHeader}`);
      
      return new NextResponse('/* CSS file blocked from script execution */', {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    
    // Otherwise, serve the CSS file normally
    console.log(`[Middleware] ✅ Allowing CSS file: ${pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all CSS files
    '/_next/static/css/:path*.css',
    // Match all chunk files that might contain CSS
    '/_next/static/chunks/:path*',
  ],
};

