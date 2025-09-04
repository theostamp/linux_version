import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const response = await makeRequestWithRetry({ method: 'get', url: `/projects/projects/${id}/` });
    return NextResponse.json({ success: true, data: response.data }, { status: 200 });
  } catch (error) {
    console.error('Project by id proxy GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch project' }, { status: 500 });
  }
}


