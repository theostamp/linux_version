import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      );
    }

    const response = await makeRequestWithRetry({
      method: 'get',
      url: '/projects/dashboard/summary/',
      params: { building_id: buildingId },
    });

    return NextResponse.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error fetching projects dashboard summary:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch projects dashboard summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
