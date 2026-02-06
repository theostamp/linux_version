import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Fallback data when backend is unavailable
const FALLBACK_RESPONSE = {
  widgets: [],
  count: 0,
  timestamp: new Date().toISOString(),
};

export async function GET(request: NextRequest) {
  const isProxyDebug = process.env.PROXY_DEBUG === 'true';
  const url = request.nextUrl || new URL(request.url);
  const buildingId = url.searchParams.get('building_id');

  if (!buildingId) {
    return NextResponse.json(
      { error: 'Building ID is required' },
      { status: 400 }
    );
  }

  // Determine backend URL
  // Default to Docker service name (backend:8000)
  // Use NEXT_PUBLIC_DJANGO_API_URL if explicitly set
  const backendUrl = (process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://backend:8000').replace(/\/$/, '');

  if (isProxyDebug) {
    console.log('[API PROXY] Using backend URL:', backendUrl);
  }

  const targetUrl = `${backendUrl}/api/kiosk/public/configs/?building_id=${buildingId}`;

  if (isProxyDebug) {
    console.log('[API PROXY] Fetching kiosk widgets from:', targetUrl);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
    const forwardedHostHeader = request.headers.get('x-tenant-host') || request.headers.get('x-forwarded-host') || request.headers.get('host');
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');

    let publicHostname = forwardedHostHeader || url.host;
    const isPlatformHost = (host?: string | null) =>
      !!host && (host.includes('railway.app') || host.includes('vercel.app') || host === 'localhost:3000');

    if (isPlatformHost(publicHostname)) {
      const candidate = origin || referer;
      if (candidate) {
        try {
          publicHostname = new URL(candidate).host;
        } catch {
          // ignore parse errors
        }
      }
    }

    const finalHost = publicHostname || 'demo.localhost';

    const headers = {
      'Content-Type': 'application/json',
      Host: finalHost,
      'X-Forwarded-Host': finalHost,
      'X-Tenant-Host': finalHost,
      'X-Forwarded-Proto': forwardedProto,
    };

    if (isProxyDebug) {
      console.log('[KIOSK-WIDGETS API] Request headers:', headers);
    }

    const response = await fetch(targetUrl, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (isProxyDebug) {
      console.log('[API PROXY] Backend response status:', response.status);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API PROXY] Backend error response:', errorText);

      // Return fallback data instead of error
      console.warn('[API PROXY] Returning fallback empty widgets due to backend error');
      return NextResponse.json(FALLBACK_RESPONSE);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a connection error
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed') || error instanceof Error && error.name === 'AbortError') {
      console.warn('[API PROXY] Backend unavailable (connection refused or timeout):', errorMessage);
      console.warn('[API PROXY] Returning fallback empty widgets. Start Django backend to see actual data.');
      console.warn('[API PROXY] Run: cd backend && python manage.py runserver 0.0.0.0:18000');

      // Return fallback data instead of error
      return NextResponse.json(FALLBACK_RESPONSE);
    }

    console.error('[API PROXY] Unexpected error fetching kiosk widgets:', error);

    // Even for unexpected errors, return fallback to prevent app crash
    return NextResponse.json(FALLBACK_RESPONSE);
  }
}
