import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');
    const project = searchParams.get('project');
    const status = searchParams.get('status');

    const params: Record<string, string> = {};
    if (buildingId) params['project__building'] = buildingId;
    if (project) params['project'] = project;
    if (status) params['status'] = status;

    const resp = await makeRequestWithRetry({ method: 'get', url: '/projects/rfqs/', params });
    return NextResponse.json({ success: true, data: resp.data }, { status: 200 });
  } catch (error) {
    console.error('RFQs proxy GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch RFQs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const resp = await makeRequestWithRetry({ method: 'post', url: '/projects/rfqs/', data: payload });
    return NextResponse.json({ success: true, data: resp.data }, { status: 201 });
  } catch (error) {
    console.error('RFQs proxy POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create RFQ' }, { status: 500 });
  }
}
