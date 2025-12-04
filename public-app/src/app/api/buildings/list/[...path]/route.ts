import { createTenantProxyHandlers, resolveParams } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/buildings/list/[...path] route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "buildings-list",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const segments = params?.path;
      const pathSegments = Array.isArray(segments)
        ? segments
        : segments
          ? [segments]
          : [];
      const path = ["buildings/list", ...pathSegments].join("/");
      console.log("[ROUTE HANDLER] buildings/list resolvePath called:", { segments, pathSegments, path });
      return path;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "buildings-list");

console.log("[ROUTE HANDLER] buildings/list handlers exported:", { GET: !!GET, POST: !!POST });

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };


