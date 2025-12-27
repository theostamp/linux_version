import type { HttpMethod, ProxyRouteContext } from "./tenantProxy";
// Re-export for convenience
export type { HttpMethod, ProxyRouteContext } from "./tenantProxy";
import type { NextRequest, NextResponse } from "next/server";

type ProxyHandler = (
  request: NextRequest,
  context: ProxyRouteContext,
) => Promise<NextResponse>;

/**
 * Type-safe helper to export route handlers with runtime validation.
 * Ensures all requested methods exist before export.
 */
export function exportHandlers(
  handlers: Partial<Record<HttpMethod, ProxyHandler>>,
  methods: readonly HttpMethod[],
  routeName: string,
): Record<HttpMethod, ProxyHandler> {
  const exports: Partial<Record<HttpMethod, ProxyHandler>> = {};

  for (const method of methods) {
    if (!handlers[method]) {
      throw new Error(
        `[${routeName}] Handler for ${method} was not created. Check createTenantProxyHandlers configuration.`,
      );
    }
    exports[method] = handlers[method]!;
  }

  return exports as Record<HttpMethod, ProxyHandler>;
}

