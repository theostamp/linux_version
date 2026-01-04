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

    const acceptHeader = request.headers.get('Accept') || '';
    const isDownload = request.nextUrl.searchParams.has('download');
    const isRaw = request.nextUrl.searchParams.has('raw');
    const wantsHtml = acceptHeader.includes('text/html') && !isRaw && !isDownload;

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
    let fileName = pathSegments[pathSegments.length - 1] || 'download';
    try {
      fileName = decodeURIComponent(fileName);
    } catch {
      // Keep encoded filename if decode fails.
    }

    if (wantsHtml) {
      const rawUrl = new URL(request.nextUrl.toString());
      rawUrl.searchParams.set('raw', '1');
      rawUrl.searchParams.delete('download');

      const downloadUrl = new URL(request.nextUrl.toString());
      downloadUrl.searchParams.set('download', '1');
      downloadUrl.searchParams.delete('raw');

      const isImage = contentType.startsWith('image/');
      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${fileName}</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #f1f5f9; color: #0f172a; }
      .container { max-width: 980px; margin: 0 auto; padding: 32px 20px; }
      .card { background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); padding: 24px; }
      .header { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
      .title { font-size: 20px; font-weight: 600; word-break: break-all; }
      .meta { font-size: 13px; color: #64748b; }
      .actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .btn { display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: #fff; padding: 10px 16px; border-radius: 999px; text-decoration: none; font-weight: 600; }
      .btn.secondary { background: #e2e8f0; color: #1e293b; }
      .preview { margin-top: 20px; text-align: center; }
      .preview img { max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <div class="header">
          <div>
            <div class="title">${fileName}</div>
            <div class="meta">Type: ${contentType}</div>
          </div>
          <div class="actions">
            <a class="btn" href="${downloadUrl.toString()}" download>Download file</a>
            <a class="btn secondary" href="${rawUrl.toString()}" target="_blank" rel="noopener">Open raw</a>
          </div>
        </div>
        ${isImage ? `<div class="preview"><img src="${rawUrl.toString()}" alt="${fileName}" /></div>` : ''}
      </div>
    </div>
  </body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const blob = await response.blob();
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': blob.size.toString(),
      'Access-Control-Allow-Origin': '*',
    };

    if (isDownload) {
      const fallbackName = fileName.replace(/["\\]/g, '_');
      const encodedName = encodeURIComponent(fileName);
      headers['Content-Disposition'] = `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
    }

    return new NextResponse(blob, { status: 200, headers });
  } catch (error) {
    console.error('[Media Proxy] Error proxying media file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch media file', details: errorMessage },
      { status: 500 }
    );
  }
}
