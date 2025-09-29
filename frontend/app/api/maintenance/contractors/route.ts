import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    const response = await makeRequestWithRetry({
      method: 'get',
      url: '/maintenance/contractors/',
      params: Object.fromEntries(qs),
    });
    return NextResponse.json({ success: true, data: response.data }, { status: 200 });
  } catch (error) {
    console.error('Contractors proxy GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch contractors' }, { status: 500 });
  }
}

