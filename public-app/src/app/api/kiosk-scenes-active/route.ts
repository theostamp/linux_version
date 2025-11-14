import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Fallback data when backend is unavailable
const FALLBACK_RESPONSE = {
  scenes: [],
  count: 0,
  timestamp: new Date().toISOString(),
};

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
  let backendUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://backend:8000';
  
  const targetUrl = `${backendUrl}/api/kiosk/public/scenes/active/?building_id=${buildingId}`;

  console.log('[KIOSK SCENES API] Fetching from:', targetUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const headers = {
      'Content-Type': 'application/json',
      // Add X-Forwarded-Host header for Django multi-tenant (works better than Host)
      'X-Forwarded-Host': 'demo.localhost',
    };

    console.log('[KIOSK SCENES API] Request headers:', headers);

    const response = await fetch(targetUrl, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[API PROXY] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API PROXY] Backend error response:', errorText);
      
      // Return fallback data instead of error
      console.warn('[API PROXY] Returning fallback empty scenes due to backend error');
      return NextResponse.json(FALLBACK_RESPONSE);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a connection error
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed') || error instanceof Error && error.name === 'AbortError') {
      console.warn('[API PROXY] Backend unavailable (connection refused or timeout):', errorMessage);
      console.warn('[API PROXY] Returning fallback empty scenes. Start Django backend to see actual data.');
      console.warn('[API PROXY] Run: cd backend && python manage.py runserver 0.0.0.0:18000');
      
      // Return fallback data instead of error
      return NextResponse.json(FALLBACK_RESPONSE);
    }
    
    console.error('[API PROXY] Unexpected error fetching kiosk scenes:', error);
    
    // Even for unexpected errors, return fallback to prevent app crash
    return NextResponse.json(FALLBACK_RESPONSE);
  }
}

