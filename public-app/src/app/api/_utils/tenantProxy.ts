import { NextRequest, NextResponse } from "next/server";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export type ProxyRouteContext = {
  params?: Record<string, string | string[] | undefined>;
};

type TenantProxyConfig = {
  resolvePath: (
    request: NextRequest,
    context: ProxyRouteContext,
    method: HttpMethod,
  ) => string;
  logLabel?: string;
  forwardSearchParams?: boolean;
  ensureTrailingSlash?: boolean;
};

type ProxyHandler = (
  request: NextRequest,
  context: ProxyRouteContext,
) => Promise<NextResponse>;

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

const buildTargetUrl = (
  request: NextRequest,
  method: HttpMethod,
  config: TenantProxyConfig,
  context: ProxyRouteContext,
) => {
  const ensureTrailingSlash = config.ensureTrailingSlash ?? true;
  const backendPath = config.resolvePath(request, context, method);
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
  
  // Log URL construction for debugging
  if (process.env.NODE_ENV === "development") {
    const logger = createLogger(config.logLabel ?? "unknown");
    logger.info("URL constructed", {
      method,
      originalPath: request.nextUrl.pathname,
      backendPath,
      normalizedPath,
      base,
      finalUrl,
    });
  }
  
  return finalUrl;
};

const createForwardHeaders = (request: NextRequest) => {
  const headers = new Headers(request.headers);
  const host = request.headers.get("host") ?? "demo.localhost";

  headers.set("Host", host);
  headers.set("X-Forwarded-Host", host);
  headers.set(
    "X-Forwarded-Proto",
    request.headers.get("x-forwarded-proto") ?? "https",
  );

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
  
  const targetUrl = buildTargetUrl(request, method, config, context);
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

