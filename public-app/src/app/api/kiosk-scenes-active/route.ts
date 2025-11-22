import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Fallback data when backend is unavailable
const FALLBACK_RESPONSE = {
  scenes: [],
  count: 0,
  timestamp: new Date().toISOString(),
};

async function fetchScenes(url: string, headers: any, timeoutMs: number = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl || new URL(request.url);
  const buildingId = url.searchParams.get('building_id');

  if (!buildingId) {
    return NextResponse.json(
      { error: 'Building ID is required' },
      { status: 400 }
    );
  }

  // Use Docker service name for backend
  const backendUrl = (process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://backend:8000').replace(/\/$/, '');
  
  // Headers for the request
  const headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-Host': 'demo.localhost',
  };

  try {
    // 1. Try the 'active' action endpoint first (preferred)
    let targetUrl = `${backendUrl}/api/kiosk/public/scenes/active/?building_id=${buildingId}`;
    console.log('[KIOSK SCENES API] Attempting active endpoint:', targetUrl);

    let response = await fetchScenes(targetUrl, headers);

    // 2. If 404, try the standard list endpoint
    if (response.status === 404) {
      console.warn('[KIOSK SCENES API] Active endpoint 404, trying list endpoint...');
      targetUrl = `${backendUrl}/api/kiosk/public/scenes/?building_id=${buildingId}`;
      response = await fetchScenes(targetUrl, headers);
    }

    console.log('[API PROXY] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API PROXY] Backend error response:', errorText);
      
      // Return fallback data instead of error to keep UI alive
      console.warn('[API PROXY] Returning fallback empty scenes due to backend error');
      return NextResponse.json(FALLBACK_RESPONSE);
    }

    const data = await response.json();
    
    // If data is an array (from list endpoint), wrap it in expected format
    if (Array.isArray(data)) {
      return NextResponse.json({
        scenes: data,
        count: data.length,
        timestamp: new Date().toISOString()
      });
    }
    
    // If data is already in expected format (from active action)
    return NextResponse.json(data);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed') || (error instanceof Error && error.name === 'AbortError')) {
      console.warn('[API PROXY] Backend unavailable (connection refused or timeout):', errorMessage);
      return NextResponse.json(FALLBACK_RESPONSE);
    }
    
    console.error('[API PROXY] Unexpected error fetching kiosk scenes:', error);
    return NextResponse.json(FALLBACK_RESPONSE);
  }
}
