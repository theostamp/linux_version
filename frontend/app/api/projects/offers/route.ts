import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');
    const status = searchParams.get('status') || '';
    const project = searchParams.get('project') || '';

    const params: Record<string, string> = {};
    if (buildingId) params['project__building'] = buildingId;
    if (status) params['status'] = status;
    if (project) params['project'] = project;

    const resp = await makeRequestWithRetry({ method: 'get', url: '/projects/offers/', params });
    return NextResponse.json({ success: true, data: resp.data }, { status: 200 });
  } catch (error) {
    console.error('Offers proxy GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch offers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const resp = await makeRequestWithRetry({ method: 'post', url: '/projects/offers/', data: payload });
    return NextResponse.json({ success: true, data: resp.data }, { status: 201 });
  } catch (error) {
    console.error('Offers proxy POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create offer' }, { status: 500 });
  }
}

