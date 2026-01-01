import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
    const forwardedHostHeader = request.headers.get('x-tenant-host') || request.headers.get('x-forwarded-host') || request.headers.get('host');
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    const urlHost = request.nextUrl.host;

    let publicHostname = forwardedHostHeader || urlHost;
    const isPlatformHost = (h?: string | null) =>
      !!h && (h.includes('railway.app') || h.includes('vercel.app') || h === 'localhost:3000');

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

    const host = publicHostname || 'demo.localhost';

    // Resolve backend URL
    const backendBase =
      process.env.API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.API_URL ??
      process.env.BACKEND_URL ??
      'https://linuxversion-production.up.railway.app';

    const cleanBase = backendBase.endsWith('/') ? backendBase.slice(0, -1) : backendBase;
    const baseWithoutApi = cleanBase.endsWith('/api') ? cleanBase.slice(0, -4) : cleanBase;

    const backendUrl = `${baseWithoutApi}/api/tenants/accept-invite/`;

    console.log('[tenants/accept-invite API] Forwarding to:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Host': host,
        Host: host,
        'X-Tenant-Host': host,
        'X-Forwarded-Proto': forwardedProto,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[tenants/accept-invite API] Backend error:', response.status, errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText.substring(0, 500) };
      }

      return NextResponse.json(
        {
          error: errorData.error || `Backend returned ${response.status}`,
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[tenants/accept-invite API] ✓ Success');

    return NextResponse.json(data);

  } catch (error) {
    console.error('[tenants/accept-invite API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to accept tenant invitation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
