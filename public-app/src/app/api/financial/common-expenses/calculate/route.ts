import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["POST", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/financial/common-expenses/calculate route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-common-expenses-calculate",
    resolvePath: () => {
      console.log("[ROUTE HANDLER] calculate resolvePath called");
      return "financial/common-expenses/calculate";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { POST, OPTIONS } = exportHandlers(handlers, methods, "financial-common-expenses-calculate");

console.log("[ROUTE HANDLER] calculate handlers exported:", { POST: !!POST, OPTIONS: !!OPTIONS });

export { POST, OPTIONS };
