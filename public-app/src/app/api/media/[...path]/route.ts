import { NextRequest, NextResponse } from 'next/server';

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

    // Get backend URL from environment
    const backendUrl = process.env.API_BASE_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      'http://localhost:18000';
    
    // Remove trailing slash and /api if present
    const cleanBackendUrl = backendUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    
    // Construct the full media URL
    const mediaUrl = `${cleanBackendUrl}/media/${mediaPath}`;
    
    console.log(`[Media Proxy] Proxying media request: ${mediaUrl}`);
    
    // Fetch the media file from Django backend
    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        // Forward any relevant headers
        'Accept': request.headers.get('Accept') || '*/*',
      },
    });

    if (!response.ok) {
      console.error(`[Media Proxy] Backend returned ${response.status} for ${mediaUrl}`);
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: response.status }
      );
    }

    // Get the content type from the response
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    
    // Get the file content as a blob
    const blob = await response.blob();
    
    // Return the file with appropriate headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache media files for 1 year
        'Content-Length': blob.size.toString(),
      },
    });
  } catch (error) {
    console.error('[Media Proxy] Error proxying media file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media file' },
      { status: 500 }
    );
  }
}

