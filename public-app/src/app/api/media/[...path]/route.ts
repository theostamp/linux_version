import { NextRequest, NextResponse } from 'next/server';

/**
 * Resolve backend base URL
 */
const resolveBackendBase = () => {
  const base =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    process.env.BACKEND_URL ??
    "https://linuxversion-production.up.railway.app";
  
  // Remove trailing slash
  return base.replace(/\/$/, '');
};

/**
 * Proxy route for media files (office logos, receipts, etc.)
 * Proxies requests to Django backend's MEDIA_URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path || [];
    const mediaPath = pathSegments.join('/');
    
    if (!mediaPath) {
      return NextResponse.json(
        { error: 'Media path is required' },
        { status: 400 }
      );
    }

    // Get backend base URL
    const backendBase = resolveBackendBase();
    
    // Construct the full media URL
    const mediaUrl = `${backendBase}/media/${mediaPath}`;
    
    console.log(`[Media Proxy] Proxying media request: ${mediaUrl}`);
    
    // Fetch the media file from Django backend
    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        // Forward any relevant headers
        'Accept': request.headers.get('Accept') || '*/*',
        'User-Agent': request.headers.get('User-Agent') || 'Next.js Media Proxy',
      },
      // Don't follow redirects automatically - handle them explicitly
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`[Media Proxy] Backend returned ${response.status} for ${mediaUrl}`);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[Media Proxy] Error response: ${errorText.substring(0, 500)}`);
      console.error(`[Media Proxy] Backend base: ${backendBase}`);
      console.error(`[Media Proxy] Full URL tried: ${mediaUrl}`);
      return NextResponse.json(
        {
          error: 'Media file not found',
          details: errorText.substring(0, 200),
          backend_url: mediaUrl,
          backend_base: backendBase,
          media_path: mediaPath
        },
        { status: response.status }
      );
    }

    // Get the content type from the response
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    
    // Get the file content as a blob
    const blob = await response.blob();
    
    console.log(`[Media Proxy] Successfully fetched media file: ${mediaPath}, size: ${blob.size} bytes, type: ${contentType}`);
    
    // Return the file with appropriate headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache media files for 1 year
        'Content-Length': blob.size.toString(),
        'Access-Control-Allow-Origin': '*', // Allow CORS for media files
      },
    });
  } catch (error) {
    console.error('[Media Proxy] Error proxying media file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch media file', details: errorMessage },
      { status: 500 }
    );
  }
}

