import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = request.headers.get('authorization') || undefined;

    const params: Record<string, string> = Object.fromEntries(searchParams.entries());
    if (params.buildingId) {
      params['building'] = params.buildingId;
      delete params.buildingId;
    }

    const response = await makeRequestWithRetry({
      method: 'get',
      url: '/projects/projects/',
      params,
      headers: auth ? { Authorization: auth } : undefined,
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
    const auth = request.headers.get('authorization') || undefined;
    const response = await makeRequestWithRetry({
      method: 'post',
      url: '/projects/projects/',
      data: payload,
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    });
    return NextResponse.json({ success: true, data: response.data }, { status: 201 });
  } catch (error) {
    console.error('Projects proxy POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500 });
  }
}

