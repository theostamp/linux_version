import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/todos/items/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "todos-items",
    resolvePath: (_request, _context) => {
      console.log("[ROUTE HANDLER] /api/todos/items resolvePath called");
      return "todos/items";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "todos-items");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
