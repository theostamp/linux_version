import { createTenantProxyHandlers } from "../_utils/tenantProxy";
import { exportHandlers } from "../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "apartments",
    resolvePath: (_request, _context) => "apartments",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "apartments");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

