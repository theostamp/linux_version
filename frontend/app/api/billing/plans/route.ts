import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_BACKEND_URL = 'https://linuxversion-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/billing/plans/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        }),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch plans' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
