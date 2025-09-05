import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const resp = await makeRequestWithRetry({ method: 'get', url: `/projects/offers/${id}/` });
    return NextResponse.json({ success: true, data: resp.data }, { status: 200 });
  } catch (error) {
    console.error('Offer proxy GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch offer' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const payload = await request.json();
    const resp = await makeRequestWithRetry({ method: 'patch', url: `/projects/offers/${id}/`, data: payload });
    return NextResponse.json({ success: true, data: resp.data }, { status: 200 });
  } catch (error) {
    console.error('Offer proxy PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update offer' }, { status: 500 });
  }
}


