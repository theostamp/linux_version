import { createTenantProxyHandlers, resolveParams } from "../../../../_utils/tenantProxy";
import { exportHandlers } from "../../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/todos/notifications/[id]/mark-read/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "todos-notifications-mark-read",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const id = params?.id as string;
      console.log(`[ROUTE HANDLER] /api/todos/notifications/${id}/mark-read resolvePath called`);
      return `todos/notifications/${id}/mark-read`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "todos-notifications-mark-read");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
