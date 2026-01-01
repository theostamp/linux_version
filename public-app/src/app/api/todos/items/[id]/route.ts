import { createTenantProxyHandlers, resolveParams } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/todos/items/[id]/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "todos-items-detail",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const id = params?.id as string;
      console.log(`[ROUTE HANDLER] /api/todos/items/${id} resolvePath called`);
      return `todos/items/${id}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "todos-items-detail");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
