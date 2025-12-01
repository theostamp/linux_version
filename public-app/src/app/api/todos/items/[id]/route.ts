import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";
import { NextRequest } from "next/server";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/todos/items/[id]/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "todos-items-detail",
    resolvePath: (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
      return context.params.then(params => {
        console.log(`[ROUTE HANDLER] /api/todos/items/${params.id} resolvePath called`);
        return `todos/items/${params.id}`;
      });
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "todos-items-detail");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

