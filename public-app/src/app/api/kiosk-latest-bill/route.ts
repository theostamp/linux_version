import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Fallback response when no bill is available
const FALLBACK_RESPONSE = {
  success: false,
  error: 'Δεν υπάρχει διαθέσιμο φύλλο κοινοχρήστων',
};

export async function GET(request: NextRequest) {
  // Use Docker service name for backend
  const backendUrl = (process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://backend:8000').replace(/\/$/, '');

  const targetUrl = `${backendUrl}/api/kiosk/latest-bill/`;

  console.log('[KIOSK BILL API] Fetching latest bill from:', targetUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (large image)

    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
    const forwardedHostHeader = request.headers.get('x-tenant-host') || request.headers.get('x-forwarded-host') || request.headers.get('host');
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');

    let publicHostname = forwardedHostHeader || request.nextUrl.host;
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

    console.log('[KIOSK BILL API] Request headers:', headers);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({}), // Empty body for POST
    });

    clearTimeout(timeoutId);

    console.log('[KIOSK BILL API] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[KIOSK BILL API] Backend error:', errorText);

      // Return fallback data
      console.warn('[KIOSK BILL API] No bill found, returning fallback');
      return NextResponse.json(FALLBACK_RESPONSE);
    }

    const data = await response.json();

    if (data.success) {
      console.log('[KIOSK BILL API] ✅ Bill loaded:', data.filename);
      console.log('[KIOSK BILL API] File size:', data.file_size, 'bytes');
      console.log('[KIOSK BILL API] Period:', data.metadata?.period);
    }

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a connection error or timeout
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed') || error instanceof Error && error.name === 'AbortError') {
      console.warn('[KIOSK BILL API] Backend unavailable or timeout:', errorMessage);
      console.warn('[KIOSK BILL API] Returning fallback response');

      return NextResponse.json(FALLBACK_RESPONSE);
    }

    console.error('[KIOSK BILL API] Unexpected error:', error);
    return NextResponse.json(FALLBACK_RESPONSE);
  }
}
