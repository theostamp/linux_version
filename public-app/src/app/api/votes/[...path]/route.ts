import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "votes",
    resolvePath: (_request, context) => {
      const segments = context.params?.path;
      const pathSegments = Array.isArray(segments)
        ? segments
        : segments
          ? [segments]
          : [];
      return ["votes", ...pathSegments].join("/");
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "votes");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };


