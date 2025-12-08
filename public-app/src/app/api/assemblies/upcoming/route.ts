import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const buildingId = searchParams.get('building_id');

  if (!buildingId) {
    return NextResponse.json(
      { error: 'building_id is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/assemblies/upcoming/?building_id=${buildingId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[assemblies/upcoming] Error:', error);
    return NextResponse.json(
      { error: 'Αδυναμία σύνδεσης με τον διακομιστή' },
      { status: 500 }
    );
  }
}

