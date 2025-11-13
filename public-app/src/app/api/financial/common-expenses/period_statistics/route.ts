import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');
    const periodId = searchParams.get('period_id');

    if (!buildingId || !periodId) {
      return NextResponse.json(
        { error: 'Building ID and Period ID are required' },
        { status: 400 }
      );
    }

    const host = request.headers.get('host') || 'demo.localhost';

    const backendBase = 
      process.env.API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.API_URL ??
      process.env.BACKEND_URL ??
      'https://linuxversion-production.up.railway.app';
    
    const cleanBase = backendBase.endsWith('/') ? backendBase.slice(0, -1) : backendBase;
    const baseWithoutApi = cleanBase.endsWith('/api') ? cleanBase.slice(0, -4) : cleanBase;

    const backendUrl = `${baseWithoutApi}/api/financial/common-expenses/period_statistics/?building_id=${buildingId}&period_id=${periodId}`;
    
    console.log('[common-expenses/period_statistics API] Fetching from:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Host': host,
        'Host': host,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[common-expenses/period_statistics API] Backend error:', response.status, errorText);
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
    console.error('[common-expenses/period_statistics API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch period statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

