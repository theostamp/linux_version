import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const host = request.headers.get('host') || 'demo.localhost';

    const backendBase = 
      process.env.API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.API_URL ??
      process.env.BACKEND_URL ??
      'https://linuxversion-production.up.railway.app';
    
    const cleanBase = backendBase.endsWith('/') ? backendBase.slice(0, -1) : backendBase;
    const baseWithoutApi = cleanBase.endsWith('/api') ? cleanBase.slice(0, -4) : cleanBase;

    const backendUrl = `${baseWithoutApi}/api/financial/common-expenses/calculate_automatically/`;
    
    console.log('[common-expenses/calculate_automatically API] Forwarding to:', backendUrl);

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
      console.error('[common-expenses/calculate_automatically API] Backend error:', response.status, errorText);
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
    console.error('[common-expenses/calculate_automatically API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate automatically',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

