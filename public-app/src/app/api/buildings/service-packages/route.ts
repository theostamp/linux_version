import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/buildings/service-packages/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "service-packages",
    resolvePath: (_request, _context) => {
      console.log("[ROUTE HANDLER] /api/buildings/service-packages resolvePath called");
      return "buildings/service-packages";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "service-packages");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

