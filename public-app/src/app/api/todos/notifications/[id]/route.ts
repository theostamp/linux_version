import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";
import { NextRequest } from "next/server";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/todos/notifications/[id]/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "todos-notifications-detail",
    resolvePath: (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
      return context.params.then(params => {
        console.log(`[ROUTE HANDLER] /api/todos/notifications/${params.id} resolvePath called`);
        return `todos/notifications/${params.id}`;
      });
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "todos-notifications-detail");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

