import { NextRequest, NextResponse } from "next/server";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

// Next.js 15+ uses Promise-based params
export type ProxyRouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

type TenantProxyConfig = {
  resolvePath: (
    request: NextRequest,
    context: ProxyRouteContext,
    method: HttpMethod,
  ) => string | Promise<string>;
  logLabel?: string;
  forwardSearchParams?: boolean;
  ensureTrailingSlash?: boolean;
};

type ProxyHandler = (
  request: NextRequest,
  context: ProxyRouteContext,
) => Promise<NextResponse>;

/**
 * Helper to resolve params whether they are a Promise (Next.js 15+) or direct value
 */
export async function resolveParams(
  params: ProxyRouteContext["params"]
): Promise<Record<string, string | string[] | undefined>> {
  if (!params) return {};
  
  // Check if params is a Promise by looking for .then method
  if (typeof params === 'object' && 'then' in params && typeof params.then === 'function') {
    return await params;
  }
  
  return params as Record<string, string | string[] | undefined>;
}

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

const isBodylessMethod = (method: string) => method === "GET" || method === "HEAD";

const stripHopByHopHeaders = (headers: Headers) => {
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));
  return headers;
};

const resolveBackendBase = () => {
  const base =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    process.env.BACKEND_URL ??
    "https://linuxversion-production.up.railway.app";

  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
};

const normalizeBackendPath = (
  path: string,
  ensureTrailingSlash: boolean,
): string => {
  if (!path || typeof path !== "string") {
    throw new Error("[tenantProxy] Invalid path provided to normalizeBackendPath");
  }
  
  const cleaned = path.replace(/^\/+/, "").trim();
  if (!cleaned) {
    throw new Error("[tenantProxy] Empty path after normalization");
  }
  
  const prefixed = cleaned.startsWith("api/") ? cleaned : `api/${cleaned}`;
  if (!ensureTrailingSlash) return prefixed;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
};

const buildTargetUrl = async (
  request: NextRequest,
  method: HttpMethod,
  config: TenantProxyConfig,
  context: ProxyRouteContext,
) => {
  const ensureTrailingSlash = config.ensureTrailingSlash ?? true;
  const backendPath = await config.resolvePath(request, context, method);
  if (!backendPath) {
    const logger = createLogger(config.logLabel ?? "unknown");
    logger.error("Empty backend path resolved", undefined, {
      method,
      path: request.nextUrl.pathname,
      contextParams: JSON.stringify(context.params),
    });
    throw new Error(
      `[tenantProxy] Empty backend path resolved for ${config.logLabel ?? "unknown"} (${method})`,
    );
  }

  const normalizedPath = normalizeBackendPath(backendPath, ensureTrailingSlash);
  const base = resolveBackendBase();
  const search = config.forwardSearchParams === false ? "" : request.nextUrl.search;
  const finalUrl = `${base}/${normalizedPath}${search}`;
  
  // Log URL construction for debugging (ALWAYS log in production too for debugging)
  const logger = createLogger(config.logLabel ?? "unknown");
  logger.info("URL constructed", {
    method,
    originalPath: request.nextUrl.pathname,
    backendPath,
    normalizedPath,
    base,
    finalUrl,
    ensureTrailingSlash: config.ensureTrailingSlash ?? true,
  });
  
  return finalUrl;
};

const createForwardHeaders = (request: NextRequest) => {
  const headers = new Headers(request.headers);
  
  // ✅ If the client explicitly provides a tenant host, prefer it.
  // This enables multi-tenant routing even when the app is served from a single public domain
  // (e.g. newconcierge.app) while the tenant schema lives under {schema}.newconcierge.app.
  const explicitTenantHost = request.headers.get("x-tenant-host") || request.headers.get("X-Tenant-Host");

  // Get the public hostname - prioritize Host header over x-forwarded-host
  // Vercel sends x-forwarded-host as the internal Railway URL, not the public domain
  // The Host header contains the actual public domain (theo.newconcierge.app)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const referer = request.headers.get("referer");
  const requestHost = request.headers.get("host") ?? "demo.localhost";
  const origin = request.headers.get("origin");

  // Priority: Origin > Referer > Host header > x-forwarded-host
  // Origin header is the most reliable source for the public domain
  let publicHostname = explicitTenantHost || requestHost;
  
  // First, try Origin header (most reliable for CORS requests)
  if (!explicitTenantHost && origin) {
    try {
      const originUrl = new URL(origin);
      publicHostname = originUrl.host;
      console.log(`[tenantProxy:headers] Using Origin header: ${publicHostname}`);
    } catch {
      // Invalid origin URL, continue with other options
    }
  }
  
  // If Host header looks like internal Vercel/Railway URL, try referer
  if (!explicitTenantHost && (publicHostname.includes("railway.app") || publicHostname.includes("vercel.app")) && referer) {
    try {
      const refererUrl = new URL(referer);
      publicHostname = refererUrl.host;
      console.log(`[tenantProxy:headers] Using Referer header: ${publicHostname}`);
    } catch {
      // Invalid referer URL, keep using current hostname
    }
  }
  
  // Only use x-forwarded-host if it's a public domain (not Railway/Vercel internal)
  if (!explicitTenantHost && forwardedHost && 
      !forwardedHost.includes("railway.app") && 
      !forwardedHost.includes("vercel.app")) {
    publicHostname = forwardedHost;
    console.log(`[tenantProxy:headers] Using X-Forwarded-Host header: ${publicHostname}`);
  }
  
  const finalHost = publicHostname;
  const subdomain = finalHost.split('.')[0];

  // Set Host header for tenant routing in Django
  // Django middleware uses X-Forwarded-Host to resolve tenant
  // Railway Edge proxy overwrites X-Forwarded-Host, so we use X-Tenant-Host as well
  headers.set("Host", finalHost);
  headers.set("X-Forwarded-Host", finalHost);
  headers.set("X-Tenant-Host", finalHost); // Custom header that Railway won't overwrite
  headers.set(
    "X-Forwarded-Proto",
    request.headers.get("x-forwarded-proto") ?? "https",
  );
  
  // Log headers for debugging (ALWAYS log in production for debugging)
  const logger = createLogger("headers");
  logger.info("Forward headers created", {
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

  return stripHopByHopHeaders(headers);
};

function createLogger(logLabel: string) {
  const prefix = logLabel ? `[tenantProxy:${logLabel}]` : "[tenantProxy]";
  const isProduction = process.env.NODE_ENV === "production";
  
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      const logData = {
        timestamp: new Date().toISOString(),
        level: "info",
        message: `${prefix} ${message}`,
        ...meta,
      };
      console.log(JSON.stringify(logData));
    },
    error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
      const logData = {
        timestamp: new Date().toISOString(),
        level: "error",
        message: `${prefix} ${message}`,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: isProduction ? undefined : error.stack,
        } : String(error),
        ...meta,
      };
      console.error(JSON.stringify(logData));
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      const logData = {
        timestamp: new Date().toISOString(),
        level: "warn",
        message: `${prefix} ${message}`,
        ...meta,
      };
      console.warn(JSON.stringify(logData));
    },
  };
}

async function proxyTenantRequest(
  method: HttpMethod,
  request: NextRequest,
  context: ProxyRouteContext,
  config: TenantProxyConfig,
) {
  const logger = createLogger(config.logLabel ?? "unknown");
  const startTime = Date.now();
  
  const targetUrl = await buildTargetUrl(request, method, config, context);
  const headers = createForwardHeaders(request);
  const host = request.headers.get("host") ?? "unknown";
  let body: ArrayBuffer | undefined;

  if (!isBodylessMethod(method) && request.body) {
    body = await request.arrayBuffer();
  }

  logger.info("Request received", {
    method,
    path: request.nextUrl.pathname,
    searchParams: request.nextUrl.search,
    host,
    targetUrl,
    hasBody: !!body,
    bodySize: body?.byteLength ?? 0,
    headers: Object.fromEntries(headers.entries()),
    subdomain: host.split('.')[0],
  });

  try {
    const init: RequestInit & { duplex?: "half" } = {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    };

    if (body) {
      // @ts-expect-error Duplex is required when forwarding request bodies in Node 18+
      init.duplex = "half";
    }

    const response = await fetch(targetUrl, init);
    const duration = Date.now() - startTime;

    logger.info("Upstream response received", {
      method,
      path: request.nextUrl.pathname,
      targetUrl,
      status: response.status,
      statusText: response.statusText,
      durationMs: duration,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      responseHeaders: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const cloned = response.clone();
      const errorText = await cloned.text();
      
      logger.error("Upstream error response", undefined, {
        method,
        path: request.nextUrl.pathname,
        targetUrl,
        status: response.status,
        statusText: response.statusText,
        durationMs: duration,
        errorBody: errorText.substring(0, 500),
        errorBodyLength: errorText.length,
      });
      
      return NextResponse.json(
        {
          error: `Upstream request failed: ${response.status} ${response.statusText}`,
          details: errorText.substring(0, 500),
          url: targetUrl,
        },
        { status: response.status },
      );
    }

    const responseHeaders = stripHopByHopHeaders(new Headers(response.headers));
    
    logger.info("Response forwarded successfully", {
      method,
      path: request.nextUrl.pathname,
      status: response.status,
      durationMs: duration,
    });
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error("Proxy request failed", error, {
      method,
      path: request.nextUrl.pathname,
      targetUrl,
      durationMs: duration,
      host,
    });

    return NextResponse.json(
      {
        error: "Unable to reach backend service",
        details: error instanceof Error ? error.message : String(error),
        url: targetUrl,
      },
      { status: 502 },
    );
  }
}

export function createTenantProxyHandlers(
  config: TenantProxyConfig,
  methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
): Partial<Record<HttpMethod, ProxyHandler>> {
  const handlers = methods.reduce<Partial<Record<HttpMethod, ProxyHandler>>>(
    (acc, method) => {
      acc[method] = (request, context) =>
        proxyTenantRequest(method, request, context, config);
      return acc;
    },
    {},
  );
  
  // Ensure all requested methods exist
  for (const method of methods) {
    if (!handlers[method]) {
      throw new Error(
        `[tenantProxy] Failed to create handler for ${method} in ${config.logLabel ?? "unknown"}`,
      );
    }
  }
  
  return handlers;
}
