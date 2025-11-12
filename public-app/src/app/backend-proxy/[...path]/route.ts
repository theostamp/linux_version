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
  const path = (ctx.params.path ?? []).join("/");
  const search = request.nextUrl.search;
  // Django backend expects /api prefix, so add it if not present
  const apiPath = path.startsWith("api/") ? path : `api/${path}`;
  // Ensure trailing slash for Django REST framework compatibility
  const normalizedPath = apiPath.endsWith("/") ? apiPath : `${apiPath}/`;
  const url = `${base}/${normalizedPath}${search}`;
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
    upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      // @ts-expect-error: duplex is required for streaming bodies in Node18+
      duplex: "half",
    });
  } catch (error) {
    console.error(`[backend-proxy] Failed to reach ${targetUrl}`, error);
    return NextResponse.json(
      { error: "Unable to reach backend service" },
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
