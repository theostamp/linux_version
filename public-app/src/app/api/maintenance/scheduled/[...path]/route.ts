import { createTenantProxyHandlers, resolveParams } from "@/app/api/_utils/tenantProxy";
import { exportHandlers } from "@/app/api/_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "maintenance-scheduled",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const pathSegments = params?.path || [];
      const path = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments;
      return `maintenance/scheduled/${path}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "maintenance-scheduled");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

