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
 * Proxy route for media files accessed via /media/...
 * This avoids loading the app shell for email links.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    const mediaPath = pathSegments.join('/');

    if (!mediaPath) {
      return NextResponse.json(
        { error: 'Media path is required' },
        { status: 400 }
      );
    }

    const backendBase = resolveBackendBase();
    const mediaUrl = `${backendBase}/media/${mediaPath}`;

    console.log(`[Media Proxy] Proxying media request: ${mediaUrl}`);

    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'Accept': request.headers.get('Accept') || '*/*',
        'User-Agent': request.headers.get('User-Agent') || 'Next.js Media Proxy',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`[Media Proxy] Backend returned ${response.status} for ${mediaUrl}`);
      const errorText = await response.text().catch(() => 'Unknown error');
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

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const blob = await response.blob();

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': blob.size.toString(),
        'Access-Control-Allow-Origin': '*',
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
