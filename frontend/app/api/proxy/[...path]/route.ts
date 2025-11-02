import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_BACKEND_URL = 'https://linuxversion-production.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PATCH');
}

export async function OPTIONS(request: NextRequest) {
  // Handle CORS preflight requests
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const path = params.path.join('/');
    const url = new URL(request.url);
    const queryString = url.search;
    
    // Preserve trailing slash from original request
    const originalPath = request.nextUrl.pathname;
    const hasTrailingSlash = originalPath.endsWith('/');
    const targetPath = hasTrailingSlash ? `${path}/` : path;
    
    const targetUrl = `${RAILWAY_BACKEND_URL}/api/${targetPath}${queryString}`;
    
    // Log proxy forwarding for debugging
    console.log('[PROXY] Forwarding request:', {
      method,
      originalPath: originalPath,
      targetUrl,
      hasQueryString: queryString.length > 0
    });
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header if present
    if (request.headers.get('authorization')) {
      headers['Authorization'] = request.headers.get('authorization')!;
    }

    // Forward other important headers
    const forwardHeaders = ['user-agent', 'accept', 'accept-language'];
    forwardHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    });

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for POST, PUT, PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await request.text();
        if (body) {
          requestOptions.body = body;
        }
      } catch (error) {
        console.error('Error reading request body:', error);
      }
    }

    const response = await fetch(targetUrl, requestOptions);

    // Handle redirects (3xx status codes)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        return NextResponse.redirect(location, response.status);
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend request failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Try to parse as JSON, fallback to text
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: { 'Content-Type': contentType || 'text/plain' }
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
