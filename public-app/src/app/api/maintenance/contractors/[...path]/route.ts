import { createTenantProxyHandlers } from "@/app/api/_utils/tenantProxy";
import { exportHandlers } from "@/app/api/_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "maintenance-contractors",
    resolvePath: (_request, context) => {
      const pathSegments = context.params?.path || [];
      const normalized = Array.isArray(pathSegments)
        ? pathSegments.join("/")
        : pathSegments;
      return `maintenance/contractors/${normalized}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "maintenance-contractors",
);

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };


