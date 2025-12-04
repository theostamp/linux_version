import { NextRequest, NextResponse } from "next/server";

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

const buildTargetUrl = (request: NextRequest) => {
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
  
  // Get the public hostname - prioritize Origin header over Host header
  // Vercel sends x-forwarded-host as the internal Railway URL, not the public domain
  // The Origin header is the most reliable source for the public domain in CORS requests
  const forwardedHost = request.headers.get("x-forwarded-host");
  const referer = request.headers.get("referer");
  const requestHost = request.headers.get("host") ?? "";
  const origin = request.headers.get("origin");
  
  // Priority: Origin > Referer > Host header > x-forwarded-host
  // Origin header is the most reliable source for the public domain
  let publicHostname = requestHost;
  
  // First, try Origin header (most reliable for CORS requests)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      publicHostname = originUrl.host;
      console.log(`[backend-proxy] Using Origin header: ${publicHostname}`);
    } catch {
      // Invalid origin URL, continue with other options
    }
  }
  
  // If Host header looks like internal Vercel/Railway URL, try referer
  if ((publicHostname.includes("railway.app") || publicHostname.includes("vercel.app")) && referer) {
    try {
      const refererUrl = new URL(referer);
      publicHostname = refererUrl.host;
      console.log(`[backend-proxy] Using Referer header: ${publicHostname}`);
    } catch {
      // Invalid referer URL, keep using current hostname
    }
  }
  
  // Only use x-forwarded-host if it's a public domain (not Railway/Vercel internal)
  if (forwardedHost && 
      !forwardedHost.includes("railway.app") && 
      !forwardedHost.includes("vercel.app")) {
    publicHostname = forwardedHost;
    console.log(`[backend-proxy] Using X-Forwarded-Host header: ${publicHostname}`);
  }
  
  const finalHost = publicHostname;
  const subdomain = finalHost.split('.')[0];
  
  // Set Host header for tenant routing in Django
  // Django middleware uses X-Forwarded-Host to resolve tenant
  // Railway Edge proxy overwrites X-Forwarded-Host, so we use X-Tenant-Host as well
  forwardHeaders.set("Host", finalHost);
  forwardHeaders.set("X-Forwarded-Host", finalHost);
  forwardHeaders.set("X-Tenant-Host", finalHost); // Custom header that Railway won't overwrite
  forwardHeaders.set(
    "X-Forwarded-Proto",
    request.headers.get("x-forwarded-proto") ?? "https",
  );
  
  // Log for debugging tenant routing
  console.log(`[backend-proxy] Forward headers:`, {
    Host: finalHost,
    "X-Forwarded-Host": finalHost,
    subdomain,
    requestHost,
    forwardedHost,
    referer,
    origin,
    decision: origin 
      ? "using-origin" 
      : (requestHost.includes("railway.app") || requestHost.includes("vercel.app"))
        ? "using-referer-or-host" 
        : "using-host",
  });

  return stripHopByHopHeaders(forwardHeaders);
};

async function proxyRequest(request: NextRequest) {
  const targetUrl = buildTargetUrl(request);
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

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}

export async function OPTIONS(request: NextRequest) {
  return proxyRequest(request);
}
