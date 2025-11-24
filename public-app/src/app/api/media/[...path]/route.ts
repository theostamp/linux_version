/**
 * Media Proxy Route
 * Proxies /api/media/* requests to the Django backend
 * This allows the frontend (Vercel) to fetch media files from the backend (Railway)
 */

import { NextRequest, NextResponse } from 'next/server';

// Get the backend API URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://theo.newconcierge.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Construct the media file path
    const mediaPath = params.path.join('/');
    const backendUrl = `${API_BASE_URL}/media/${mediaPath}`;

    console.log(`[Media Proxy] Fetching: ${backendUrl}`);

    // Fetch from backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        // Forward relevant headers
        'User-Agent': request.headers.get('user-agent') || 'Next.js Media Proxy',
      },
      // Don't follow redirects automatically
      redirect: 'manual',
    });

    // If not found, return 404
    if (response.status === 404) {
      console.log(`[Media Proxy] File not found: ${mediaPath}`);
      return new NextResponse('Media file not found', { status: 404 });
    }

    // If error, return error
    if (!response.ok) {
      console.error(`[Media Proxy] Error fetching media: ${response.status} ${response.statusText}`);
      return new NextResponse('Error fetching media file', { status: response.status });
    }

    // Get the file data
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Get content type from response or guess from extension
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    console.log(`[Media Proxy] Successfully fetched: ${mediaPath} (${contentType}, ${buffer.length} bytes)`);

    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `inline; filename="${params.path[params.path.length - 1]}"`,
      },
    });
  } catch (error) {
    console.error('[Media Proxy] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
