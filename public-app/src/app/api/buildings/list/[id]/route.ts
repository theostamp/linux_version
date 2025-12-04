import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/buildings/list/[id]/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "building-detail",
    resolvePath: (_request, context) => {
      const id = context.params?.id;
      console.log("[ROUTE HANDLER] building-detail resolvePath called with id:", id);
      return `buildings/list/${id}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "building-detail");

console.log("[ROUTE HANDLER] building-detail handlers exported:", { GET: !!GET, PUT: !!PUT });

export { GET, PUT, PATCH, DELETE, OPTIONS };

