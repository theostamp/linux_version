import { createTenantProxyHandlers, resolveParams } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "office-ops",
    resolvePath: async (_request, context) => {
      const params = await resolveParams(context.params);
      const segments = params?.path;
      const pathSegments = Array.isArray(segments)
        ? segments
        : segments
          ? [segments]
          : [];
      return ["office-ops", ...pathSegments].join("/");
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "office-ops");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
