import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');
    const status = searchParams.get('status') || '';

    const qs = new URLSearchParams();
    if (buildingId) qs.set('building', buildingId);
    if (status) qs.set('status', status);

    const response = await makeRequestWithRetry({
      method: 'get',
      url: '/projects/projects/',
      params: Object.fromEntries(qs),
    });
    return NextResponse.json({ success: true, data: response.data }, { status: 200 });
  } catch (error) {
    console.error('Projects proxy GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const response = await makeRequestWithRetry({
      method: 'post',
      url: '/projects/projects/',
      data: payload,
      headers: { 'Content-Type': 'application/json' },
    });
    return NextResponse.json({ success: true, data: response.data }, { status: 201 });
  } catch (error) {
    console.error('Projects proxy POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500 });
  }
}

