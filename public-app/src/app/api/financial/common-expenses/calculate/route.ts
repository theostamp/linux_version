import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get the host from the request to forward it to the backend
    const host = request.headers.get('host') || 'demo.localhost';
    const subdomain = host.split('.')[0];

    // Resolve backend URL
    const backendBase = 
      process.env.API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.API_URL ??
      process.env.BACKEND_URL ??
      'https://linuxversion-production.up.railway.app';
    
    const cleanBase = backendBase.endsWith('/') ? backendBase.slice(0, -1) : backendBase;
    const baseWithoutApi = cleanBase.endsWith('/api') ? cleanBase.slice(0, -4) : cleanBase;

    // Forward the request to the financial common expenses calculate endpoint
    const backendUrl = `${baseWithoutApi}/api/financial/common-expenses/calculate/`;
    
    console.log('[common-expenses/calculate API] Forwarding to:', backendUrl);
    console.log('[common-expenses/calculate API] Subdomain:', subdomain);
    console.log('[common-expenses/calculate API] Body:', JSON.stringify(body).substring(0, 200));

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Host': host,
        'Host': host,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[common-expenses/calculate API] Backend error:', response.status, response.statusText, errorText);
      return NextResponse.json(
        { 
          error: `Backend returned ${response.status}`,
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('[common-expenses/calculate API] ✓ Success');

    return NextResponse.json(data);

  } catch (error) {
    console.error('[common-expenses/calculate API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate common expenses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

