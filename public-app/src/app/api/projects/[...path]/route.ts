import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "projects",
    resolvePath: (_request, context) => {
      const pathParam = context.params?.path;
      const segments = Array.isArray(pathParam)
        ? pathParam
        : pathParam
          ? [pathParam]
          : [];
      return segments.length > 0
        ? ["projects", ...segments].join("/")
        : "projects";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "projects",
);

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

