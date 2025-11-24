/**
 * Debug Media Info Proxy
 * Proxies debug requests to the Django backend
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://theo.newconcierge.app';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = `${API_BASE_URL}/api/debug/media-info/`;

    console.log(`[Debug Proxy] Fetching: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Next.js Debug Proxy',
      },
    });

    if (!response.ok) {
      console.error(`[Debug Proxy] Error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch debug info', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log(`[Debug Proxy] Success:`, data);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Debug Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
