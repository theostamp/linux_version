import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');
    const month = searchParams.get('month');

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      );
    }

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

    // Forward the request to the financial dashboard endpoint
    let backendUrl = `${baseWithoutApi}/api/financial/dashboard/apartment_balances/?building_id=${buildingId}`;
    
    if (month) {
      backendUrl += `&month=${month}`;
    }
    
    console.log('[apartment_balances API] Fetching from:', backendUrl);
    console.log('[apartment_balances API] Subdomain:', subdomain);

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
      console.error('[apartment_balances API] Backend error:', response.status, response.statusText, errorText);
      return NextResponse.json(
        { 
          error: `Backend returned ${response.status}`,
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('[apartment_balances API] ✓ Success, apartments:', data.apartments?.length || 0);

    return NextResponse.json(data);

  } catch (error) {
    console.error('[apartment_balances API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch apartment balances',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

