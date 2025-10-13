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

    // Forward the request to the kiosk apartment-debts endpoint which returns current_balance
    const backendUrl = `${process.env.BACKEND_URL || 'http://backend:8000'}/api/kiosk/apartment-debts/?building_id=${buildingId}`;
    
    console.log('[apartment_balances API] Fetching from:', backendUrl);
    console.log('[apartment_balances API] Subdomain:', subdomain);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Host': host,
      },
    });

    if (!response.ok) {
      console.error('[apartment_balances API] Backend error:', response.status, response.statusText);
      throw new Error(`Backend returned ${response.status}`);
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

