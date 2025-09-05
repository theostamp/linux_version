import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = request.headers.get('authorization') || undefined;

    const params: Record<string, string> = Object.fromEntries(searchParams.entries());
    if (params.buildingId) {
      params['project__building'] = params.buildingId;
      delete params.buildingId;
    }

    const resp = await makeRequestWithRetry({ method: 'get', url: '/projects/offers/', params, headers: auth ? { Authorization: auth } : undefined });
    return NextResponse.json({ success: true, data: resp.data }, { status: 200 });
  } catch (error) {
    console.error('Offers proxy GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch offers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const auth = request.headers.get('authorization') || undefined;
    const resp = await makeRequestWithRetry({ method: 'post', url: '/projects/offers/', data: payload, headers: auth ? { Authorization: auth } : undefined });
    return NextResponse.json({ success: true, data: resp.data }, { status: 201 });
  } catch (error) {
    console.error('Offers proxy POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create offer' }, { status: 500 });
  }
}

