import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const dest = request.headers.get('sec-fetch-dest');
  // When Next injects CSS files with <script> tags, respond with harmless JS so the browser
  // does not attempt to execute the CSS bundle and raise a SyntaxError.
  if (dest === 'script') {
    return new NextResponse('/* Ignoring CSS script load */', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/_next/static/css/:path*',
};

