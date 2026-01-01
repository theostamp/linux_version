import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/todos/categories/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "todos-categories",
    resolvePath: (_request, _context) => {
      console.log("[ROUTE HANDLER] /api/todos/categories resolvePath called");
      return "todos/categories";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "todos-categories");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
