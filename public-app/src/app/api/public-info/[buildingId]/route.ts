import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Fallback data when backend is unavailable
const FALLBACK_RESPONSE = {
  building_info: {
    id: 1,
    name: 'Demo Building',
    address: 'Demo Address',
    city: 'Athens',
    total_apartments: 0,
    occupied: 0,
  },
  announcements: [],
  votes: [],
  financial: {
    collection_rate: 0,
    reserve_fund: 0,
    recent_expenses: [],
  },
  maintenance: {
    pending_requests: 0,
    completed_this_month: 0,
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  const { buildingId } = await params;

  if (!buildingId) {
    return NextResponse.json(
      { error: 'Building ID is required' },
      { status: 400 }
    );
  }

  // Determine backend URL - use Docker service name when in container
  // Default to Docker service name (backend:8000)
  const backendUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://backend:8000';
  
  console.log('[PUBLIC-INFO API] ===== NEW CODE VERSION =====');
  console.log('[PUBLIC-INFO API] Using backend URL:', backendUrl);
  console.log('[PUBLIC-INFO API] Building ID:', buildingId);
  
  const targetUrl = `${backendUrl}/api/public-info/${buildingId}/`;

  console.log('[PUBLIC-INFO API] Fetching from:', targetUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const headers = {
      'Content-Type': 'application/json',
      // Add X-Forwarded-Host header for Django multi-tenant (works better than Host)
      'X-Forwarded-Host': 'demo.localhost',
    };

    console.log('[PUBLIC-INFO API] Request headers:', headers);

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
      console.warn('[API PROXY] Returning fallback public info due to backend error');
      return NextResponse.json(FALLBACK_RESPONSE);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a connection error
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed') || error instanceof Error && error.name === 'AbortError') {
      console.warn('[API PROXY] Backend unavailable (connection refused or timeout):', errorMessage);
      console.warn('[API PROXY] Returning fallback public info. Start Django backend to see actual data.');
      
      // Return fallback data instead of error
      return NextResponse.json(FALLBACK_RESPONSE);
    }
    
    console.error('[API PROXY] Unexpected error fetching public info:', error);
    
    // Even for unexpected errors, return fallback to prevent app crash
    return NextResponse.json(FALLBACK_RESPONSE);
  }
}

