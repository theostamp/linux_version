import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
    const forwardedHostHeader = request.headers.get('x-tenant-host') || request.headers.get('x-forwarded-host') || request.headers.get('host');
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    const urlHost = request.nextUrl.host;

    let publicHostname = forwardedHostHeader || urlHost;
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

    const host = publicHostname || 'demo.localhost';

    const backendBase = 
      process.env.API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.API_URL ??
      process.env.BACKEND_URL ??
      'https://linuxversion-production.up.railway.app';
    
    const cleanBase = backendBase.endsWith('/') ? backendBase.slice(0, -1) : backendBase;
    const baseWithoutApi = cleanBase.endsWith('/api') ? cleanBase.slice(0, -4) : cleanBase;

    const backendUrl = `${baseWithoutApi}/api/financial/common-expenses/issue/`;
    
    console.log('[common-expenses/issue API] Forwarding to:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Host': host,
        Host: host,
        'X-Tenant-Host': host,
        'X-Forwarded-Proto': forwardedProto,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[common-expenses/issue API] Backend error:', response.status, errorText);
      return NextResponse.json(
        { 
          error: `Backend returned ${response.status}`,
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[common-expenses/issue API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to issue common expenses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
