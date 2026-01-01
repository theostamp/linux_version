import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["POST", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/buildings/actions/remove-membership/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "buildings/actions/remove-membership",
    resolvePath: (_request, _context) => {
      console.log("[ROUTE HANDLER] /api/buildings/actions/remove-membership resolvePath called");
      return "buildings/actions/remove-membership";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { POST, OPTIONS } = exportHandlers(handlers, methods, "buildings/actions/remove-membership");

export { POST, OPTIONS };
