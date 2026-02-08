import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["POST", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "office-finance-warm-cache",
    resolvePath: (_request, _context) => "office-finance/warm-cache",
    ensureTrailingSlash: true,
  },
  methods,
);

const { POST, OPTIONS } = exportHandlers(handlers, methods, "office-finance-warm-cache");

export { POST, OPTIONS };
