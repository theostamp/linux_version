import { createTenantProxyHandlers } from "../../../../_utils/tenantProxy";
import { exportHandlers } from "../../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/buildings/service-packages/[...path]/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "service-packages",
    resolvePath: (_request, context) => {
      const pathSegments = context.params?.path || [];
      const path = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments;
      console.log("[ROUTE HANDLER] /api/buildings/service-packages/[...path] resolvePath called with path:", path);
      return `buildings/service-packages/${path}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "service-packages");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

