import type { HttpMethod } from "./tenantProxy";

type ProxyHandler = (
  request: any,
  context: any,
) => Promise<any>;

/**
 * Type-safe helper to export route handlers with runtime validation.
 * Ensures all requested methods exist before export.
 */
export function exportHandlers(
  handlers: Partial<Record<HttpMethod, ProxyHandler>>,
  methods: HttpMethod[],
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

