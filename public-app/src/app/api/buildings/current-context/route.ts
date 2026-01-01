import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/buildings/current-context/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "buildings/current-context",
    resolvePath: (_request, _context) => {
      console.log("[ROUTE HANDLER] /api/buildings/current-context resolvePath called");
      return "buildings/current-context";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, OPTIONS } = exportHandlers(handlers, methods, "buildings/current-context");

export { GET, OPTIONS };
