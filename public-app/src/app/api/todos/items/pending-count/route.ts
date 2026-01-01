import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/todos/items/pending-count/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "todos-items-pending-count",
    resolvePath: (_request, _context) => {
      console.log("[ROUTE HANDLER] /api/todos/items/pending-count resolvePath called");
      return "todos/items/pending-count";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "todos-items-pending-count");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
