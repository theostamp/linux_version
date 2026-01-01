import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["POST", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/buildings/actions/add-membership/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "buildings/actions/add-membership",
    resolvePath: (_request, _context) => {
      console.log("[ROUTE HANDLER] /api/buildings/actions/add-membership resolvePath called");
      return "buildings/actions/add-membership";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { POST, OPTIONS } = exportHandlers(handlers, methods, "buildings/actions/add-membership");

export { POST, OPTIONS };
