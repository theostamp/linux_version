import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["POST", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/financial/common-expenses/calculate_advanced route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-common-expenses-calculate-advanced",
    resolvePath: () => {
      console.log("[ROUTE HANDLER] calculate_advanced resolvePath called");
      return "financial/common-expenses/calculate-advanced";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { POST, OPTIONS } = exportHandlers(handlers, methods, "financial-common-expenses-calculate-advanced");

console.log("[ROUTE HANDLER] calculate_advanced handlers exported:", { POST: !!POST, OPTIONS: !!OPTIONS });

export { POST, OPTIONS };

