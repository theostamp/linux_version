import { NextRequest, NextResponse } from 'next/server';

// Get Railway backend URL from environment or use default
const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 
                            process.env.BACKEND_URL || 
                            'https://linuxversion-production.up.railway.app';

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

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const pathSegments = params.path;
    const path = pathSegments.join('/');
    const url = new URL(request.url);
    const queryString = url.search;

    const originalPath = request.nextUrl.pathname;
    const originalHasTrailingSlash = originalPath.endsWith('/');

    const needsTrailingSlash = shouldForceTrailingSlash(path);
    const targetPath = originalHasTrailingSlash || needsTrailingSlash
      ? ensureTrailingSlash(path)
      : path;

    const targetUrl = `${RAILWAY_BACKEND_URL}/api/${targetPath}${queryString}`;

    console.log(`[Proxy] ${method} ${targetUrl} (segments: ${JSON.stringify(pathSegments)})`);
    console.log(`[Proxy] Backend URL: ${RAILWAY_BACKEND_URL}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log(`[Proxy] Forwarding Authorization header: ${authHeader.substring(0, 20)}...`);
    } else {
      console.log('[Proxy] No Authorization header found in request');
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
      // Add timeout for Railway backend
      signal: AbortSignal.timeout(30000), // 30 second timeout
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

    let response: Response;
    try {
      response = await fetch(targetUrl, requestOptions);
    } catch (error: any) {
      console.error(`[Proxy] Network error connecting to ${targetUrl}:`, error);
      
      // Handle timeout or network errors
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return NextResponse.json(
          { 
            error: 'Backend request timed out',
            details: 'The backend server took too long to respond. Please try again later.',
            status: 504,
            url: targetUrl
          },
          { status: 504 }
        );
      }
      
      // Handle connection refused or other network errors
      return NextResponse.json(
        { 
          error: 'Backend connection failed',
          details: error.message || 'Unable to connect to backend server',
          status: 502,
          url: targetUrl
        },
        { status: 502 }
      );
    }

    // Handle redirects (3xx status codes)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        return NextResponse.redirect(location, response.status);
      }
    }

    if (!response.ok) {
      console.error(`[Proxy] Backend request failed: ${response.status} ${response.statusText}`);
      console.error(`[Proxy] Target URL: ${targetUrl}`);
      
      // Try to get error details from response
      let errorDetails;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorDetails = await response.json();
        } else {
          errorDetails = await response.text();
        }
      } catch (e) {
        errorDetails = response.statusText;
      }
      
      return NextResponse.json(
        { 
          error: `Backend request failed: ${response.statusText}`,
          details: errorDetails,
          status: response.status,
          url: targetUrl
        },
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

function shouldForceTrailingSlash(path: string): boolean {
  if (!path) {
    return false;
  }

  const lastSegment = path.split('/').pop() ?? '';

  // Do not force trailing slash for paths that look like files (contain a dot)
  if (lastSegment.includes('.')) {
    return false;
  }

  return !path.endsWith('/');
}

function ensureTrailingSlash(path: string): string {
  if (!path) {
    return path;
  }

  return path.endsWith('/') ? path : `${path}/`;
}
