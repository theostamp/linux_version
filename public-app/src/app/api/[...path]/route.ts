import { createTenantProxyHandlers } from "@/app/api/_utils/tenantProxy";
import type { ProxyRouteContext } from "@/app/api/_utils/tenantProxy";
import type { NextRequest } from "next/server";

/**
 * Catch-all API proxy:
 * Handles any `/api/*` request that doesn't have a more specific route handler.
 *
 * This prevents Next.js from returning 404s for valid backend endpoints
 * like `/api/buildings/`, `/api/financial/my-apartment/`, `/api/todos/notifications/`, etc.
 *
 * Note: more specific routes (e.g. `/api/users/*`, `/api/votes/*`) will still take priority.
 */
const handlers = createTenantProxyHandlers(
  {
    logLabel: "api-catchall",
    resolvePath: async (_request: NextRequest, context: ProxyRouteContext) => {
      const params = await (async () => {
        const raw = context.params;
        if (!raw) return {};
        if (typeof raw === "object" && "then" in raw && typeof (raw as any).then === "function") {
          return await (raw as any);
        }
        return raw as Record<string, string | string[] | undefined>;
      })();

      const pathParam = params.path;
      const parts = Array.isArray(pathParam) ? pathParam : [pathParam].filter(Boolean);
      const joined = parts.join("/");
      if (!joined) return "api/"; // Should never happen, but avoids empty path
      return joined;
    },
    forwardSearchParams: true,
    ensureTrailingSlash: true,
  },
  ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
);

export const GET = handlers.GET!;
export const POST = handlers.POST!;
export const PUT = handlers.PUT!;
export const PATCH = handlers.PATCH!;
export const DELETE = handlers.DELETE!;
export const OPTIONS = handlers.OPTIONS!;


