import { createTenantProxyHandlers, resolveParams } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/buildings/list/[id]/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "building-detail",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const id = params?.id;
      console.log("[ROUTE HANDLER] building-detail resolvePath called with id:", id);
      if (!id || id === 'undefined') {
        throw new Error(`[building-detail] Invalid building ID: ${id}`);
      }
      return `buildings/list/${id}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "building-detail");

console.log("[ROUTE HANDLER] building-detail handlers exported:", { GET: !!GET, PUT: !!PUT });

export { GET, PUT, PATCH, DELETE, OPTIONS };
