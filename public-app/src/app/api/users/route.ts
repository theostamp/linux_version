import { createTenantProxyHandlers } from "../_utils/tenantProxy";
import { exportHandlers } from "../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/users/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "users-root",
    resolvePath: () => "users",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "users-root");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

