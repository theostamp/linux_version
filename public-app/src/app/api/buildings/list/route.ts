import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "buildings-list",
    resolvePath: (_request, _context) => "buildings/list",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "buildings-list");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

