import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "users",
    resolvePath: (_request, context) => {
      const segments = context.params?.path;
      const pathSegments = Array.isArray(segments)
        ? segments
        : segments
          ? [segments]
          : [];
      return ["users", ...pathSegments].join("/");
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "users");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

