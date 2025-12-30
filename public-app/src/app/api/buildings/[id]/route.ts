import { createTenantProxyHandlers, resolveParams } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/buildings/[id]/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "building-detail-alias",
    resolvePath: async (_request, context) => {
      const params = await resolveParams(context.params);
      const id = params?.id;
      console.log("[ROUTE HANDLER] building-detail-alias resolvePath called with id:", id);
      if (!id || id === "undefined") {
        throw new Error(`[building-detail-alias] Invalid building ID: ${id}`);
      }
      return `buildings/list/${id}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "building-detail-alias");

console.log("[ROUTE HANDLER] building-detail-alias handlers exported:", { GET: !!GET, PUT: !!PUT });

export { GET, PUT, PATCH, DELETE, OPTIONS };
