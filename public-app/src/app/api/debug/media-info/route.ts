/**
 * Debug Media Info Proxy
 * Proxies debug requests to the Django backend
 */

import { NextRequest, NextResponse } from 'next/server';

// Use BACKEND_URL for server-side requests (should point to Railway)
// This avoids the loop that happens when using the public URL
const BACKEND_URL = process.env.BACKEND_URL || process.env.RAILWAY_BACKEND_URL || 'https://theo.newconcierge.app';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = `${BACKEND_URL}/api/debug/media-info/`;

    console.log(`[Debug Proxy] Backend URL: ${BACKEND_URL}`);
    console.log(`[Debug Proxy] Fetching: ${backendUrl}`);

    // Prevent loop: if BACKEND_URL is same as request origin, return error
    const requestOrigin = request.headers.get('host');
    if (BACKEND_URL.includes(requestOrigin || '')) {
      console.error('[Debug Proxy] Loop detected! BACKEND_URL points to same domain');
      return NextResponse.json({
        error: 'Configuration error',
        message: 'BACKEND_URL environment variable must point to Railway backend, not Vercel frontend',
        current_backend_url: BACKEND_URL,
        request_host: requestOrigin,
        hint: 'Set BACKEND_URL in Vercel environment variables to point to Railway backend URL'
      }, { status: 500 });
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Next.js Debug Proxy',
      },
    });

    if (!response.ok) {
      console.error(`[Debug Proxy] Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: 'Failed to fetch debug info',
          status: response.status,
          backend_url: backendUrl,
          response_text: errorText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log(`[Debug Proxy] Success:`, data);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Debug Proxy] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: String(error),
        backend_url: BACKEND_URL
      },
      { status: 500 }
    );
  }
}
