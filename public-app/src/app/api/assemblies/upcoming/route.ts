import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_CORE_API_URL ||
  'https://linuxversion-production.up.railway.app';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const buildingId = searchParams.get('building_id');

  if (!buildingId) {
    return NextResponse.json(
      { error: 'building_id is required' },
      { status: 400 }
    );
  }

  const normalizedBase = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
  const targetUrl = `${normalizedBase}/api/assemblies/upcoming/?building_id=${buildingId}`;

  console.log('[assemblies/upcoming] Fetching from:', targetUrl);

  try {
    // Extract tenant host from request headers
    const forwardedHost = request.headers.get('x-forwarded-host');
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    const requestHost = request.headers.get('host') ?? '';

    let publicHostname = request.headers.get('x-tenant-host') || requestHost;

    if (origin) {
      try {
        publicHostname = new URL(origin).host;
      } catch {
        // ignore invalid origin
      }
    }

    if (
      (publicHostname.includes('railway.app') || publicHostname.includes('vercel.app')) &&
      referer
    ) {
      try {
        publicHostname = new URL(referer).host;
      } catch {
        // ignore invalid referer
      }
    }

    if (
      forwardedHost &&
      !forwardedHost.includes('railway.app') &&
      !forwardedHost.includes('vercel.app')
    ) {
      publicHostname = forwardedHost;
    }

    const finalHost = publicHostname || 'demo.localhost';

    console.log('[assemblies/upcoming] Using Host header:', finalHost);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Host': finalHost,
        'X-Forwarded-Host': finalHost,
        'X-Tenant-Host': finalHost,
        'X-Forwarded-Proto': request.headers.get('x-forwarded-proto') ?? 'https',
      },
    });

    console.log('[assemblies/upcoming] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[assemblies/upcoming] Backend error:', errorText);

      // Return empty assembly instead of error to not break the UI
      return NextResponse.json({ assembly: null });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[assemblies/upcoming] Error:', error);
    // Return empty assembly instead of error to not break the UI
    return NextResponse.json({ assembly: null });
  }
}
