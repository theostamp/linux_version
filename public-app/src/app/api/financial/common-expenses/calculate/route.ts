import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["POST", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-common-expenses-calculate",
    resolvePath: () => "financial/common-expenses/calculate",
    ensureTrailingSlash: true,
  },
  methods,
);

const { POST, OPTIONS } = exportHandlers(handlers, methods, "financial-common-expenses-calculate");

export { POST, OPTIONS };

