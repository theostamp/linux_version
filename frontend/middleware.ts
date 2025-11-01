import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_BASE = 'newconcierge.app';

export const config = {
  matcher: ['/((?!_next|static|images|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)'],
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const dest = request.headers.get('sec-fetch-dest');
  const acceptHeader = request.headers.get('Accept');

  // Intercept CSS files being loaded as scripts (existing functionality)
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

  // Subdomain routing for tenant access
  // Skip for localhost and 127.0.0.1 (development)
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return NextResponse.next();
  }

  // Only process requests from newconcierge.app domain
  if (!host.endsWith(PUBLIC_BASE)) {
    return NextResponse.next();
  }

  // Extract subdomain (e.g., alpha.newconcierge.app -> alpha)
  const parts = host.split('.');
  const sub = parts.length >= 3 ? parts[0] : null;

  // If subdomain exists and is not 'newconcierge' or 'www', rewrite to /tenant/... path
  if (sub && sub !== 'newconcierge' && sub !== 'www') {
    console.log(`[Middleware] 🏢 Tenant subdomain detected: ${sub}, rewriting to /tenant${pathname}`);
    url.searchParams.set('tenant', sub);
    url.pathname = `/tenant${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

