import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/todos/notifications/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "todos-notifications",
    resolvePath: (_request, _context) => {
      console.log("[ROUTE HANDLER] /api/todos/notifications resolvePath called");
      return "todos/notifications";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "todos-notifications");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

