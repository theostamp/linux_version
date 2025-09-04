import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');
    const status = searchParams.get('status') || '';
    const contractor = searchParams.get('contractor') || '';

    const params: Record<string, string> = {};
    if (buildingId) params['project__building'] = buildingId;
    if (status) params['status'] = status;
    if (contractor) params['contractor'] = contractor;

    const response = await makeRequestWithRetry({
      method: 'get',
      url: '/projects/contracts/',
      params,
    });
    return NextResponse.json({ success: true, data: response.data }, { status: 200 });
  } catch (error) {
    console.error('Contracts proxy GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const response = await makeRequestWithRetry({
      method: 'post',
      url: '/projects/contracts/',
      data: payload,
      headers: { 'Content-Type': 'application/json' },
    });
    return NextResponse.json({ success: true, data: response.data }, { status: 201 });
  } catch (error) {
    console.error('Contracts proxy POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create contract' }, { status: 500 });
  }
}

