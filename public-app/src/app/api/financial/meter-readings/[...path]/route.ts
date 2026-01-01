import { createTenantProxyHandlers, resolveParams } from "@/app/api/_utils/tenantProxy";
import { exportHandlers } from "@/app/api/_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-meter-readings",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const pathSegments = params?.path || [];
      const normalized = Array.isArray(pathSegments)
        ? pathSegments.join("/")
        : pathSegments;
      return `financial/meter-readings/${normalized}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "financial-meter-readings",
);

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
