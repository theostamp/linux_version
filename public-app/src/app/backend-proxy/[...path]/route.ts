import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: { path?: string[] };
};

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

const isBodylessMethod = (method: string) => ["GET", "HEAD"].includes(method);

const resolveBackendBaseUrl = () => {
  const base =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    "https://linuxversion-production.up.railway.app";

  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const stripHopByHopHeaders = (headers: Headers) => {
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));
  return headers;
};

const buildTargetUrl = (ctx: RouteContext, request: NextRequest) => {
  const base = resolveBackendBaseUrl();
  // Get the original path from the request URL to preserve trailing slash
  const originalPath = request.nextUrl.pathname.replace('/backend-proxy', '');
  const path = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath;
  const search = request.nextUrl.search;
  
  // The path already comes from /api/* rewrite, so it doesn't have /api/ prefix
  // Django backend expects /api prefix, so add it
  // But check if base already includes /api to avoid double prefix
  let apiPath = path;
  if (!path.startsWith("api/")) {
    apiPath = `api/${path}`;
  }
  
  // Ensure trailing slash for Django REST framework compatibility
  const normalizedPath = apiPath.endsWith("/") ? apiPath : `${apiPath}/`;
  
  // Check if base already ends with /api to avoid double /api/api/
  let finalBase = base;
  if (finalBase.endsWith('/api')) {
    // Base already has /api, so remove it to avoid double prefix
    finalBase = finalBase.slice(0, -4); // Remove /api
  }
  
  const url = `${finalBase}/${normalizedPath}${search}`;
  
  console.log(`[backend-proxy] Method: ${request.method}, Original: ${request.nextUrl.pathname}, Path: ${path}, API Path: ${apiPath}, Base: ${finalBase}, Final: ${url}`);
  
  return url;
};

const createForwardHeaders = (request: NextRequest) => {
  const forwardHeaders = new Headers(request.headers);
  const host = request.headers.get("host") ?? "";
  
  // Set Host header for tenant routing in Django
  forwardHeaders.set("Host", host);
  forwardHeaders.set("X-Forwarded-Host", host);
  forwardHeaders.set(
    "X-Forwarded-Proto",
    request.headers.get("x-forwarded-proto") ?? "https",
  );
  
  return stripHopByHopHeaders(forwardHeaders);
};

async function proxyRequest(request: NextRequest, ctx: RouteContext) {
  const targetUrl = buildTargetUrl(ctx, request);
  const headers = createForwardHeaders(request);
  let body: ArrayBuffer | undefined;

  if (!isBodylessMethod(request.method) && request.body) {
    body = await request.arrayBuffer();
  }

  let upstreamResponse: Response;
  try {
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      upstreamResponse = await fetch(targetUrl, {
        method: request.method,
        headers,
        body,
        redirect: "manual",
        signal: controller.signal,
        // @ts-expect-error: duplex is required for streaming bodies in Node18+
        duplex: "half",
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error(`Request timeout after 30 seconds to ${targetUrl}`);
      }
      throw fetchError;
    }
    
    console.log(`[backend-proxy] Response status: ${upstreamResponse.status} for ${targetUrl}`, {
      method: request.method,
      originalPath: request.nextUrl.pathname,
      targetUrl,
      headers: Object.fromEntries(upstreamResponse.headers.entries()),
    });
    
    // Log response details for debugging
    if (!upstreamResponse.ok) {
      // Clone the response to read body without consuming the original
      const clonedResponse = upstreamResponse.clone();
      const responseText = await clonedResponse.text();
      console.error(`[backend-proxy] Error response from ${targetUrl}:`, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        body: responseText.substring(0, 500), // First 500 chars
        fullBodyLength: responseText.length,
        requestHeaders: Object.fromEntries(headers.entries()),
      });
      
      // Return error response with more details
      return NextResponse.json(
        { 
          error: `Backend request failed: ${upstreamResponse.status} ${upstreamResponse.statusText}`,
          details: responseText.substring(0, 500),
          url: targetUrl
        },
        { status: upstreamResponse.status },
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[backend-proxy] Failed to reach ${targetUrl}`, {
      error: errorMessage,
      stack: errorStack,
      targetUrl,
      method: request.method,
      base: resolveBackendBaseUrl(),
      env: {
        API_BASE_URL: process.env.API_BASE_URL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        API_URL: process.env.API_URL,
      }
    });
    
    return NextResponse.json(
      { 
        error: "Unable to reach backend service",
        details: errorMessage,
        url: targetUrl,
        base: resolveBackendBaseUrl(),
      },
      { status: 502 },
    );
  }

  const responseHeaders = stripHopByHopHeaders(
    new Headers(upstreamResponse.headers),
  );

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, ctx);
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, ctx);
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, ctx);
}

export async function OPTIONS(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, ctx);
}
