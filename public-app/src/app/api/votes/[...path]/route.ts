import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";
import type { NextRequest } from "next/server";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

// Diagnostic logging for mismatched data
export function middleware(request: NextRequest) {
  console.log("[votes proxy:path] incoming", {
    path: request.nextUrl.pathname,
    search: request.nextUrl.search,
    host: request.headers.get("host"),
    xForwardedHost: request.headers.get("x-forwarded-host"),
    xTenantHost: request.headers.get("x-tenant-host"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
  });
}

const handlers = createTenantProxyHandlers(
  {
    logLabel: "votes",
    resolvePath: (_request, context) => {
      const segments = context.params?.path;
      const pathSegments = Array.isArray(segments)
        ? segments
        : segments
          ? [segments]
          : [];
      return ["votes", ...pathSegments].join("/");
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "votes");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

