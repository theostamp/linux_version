import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-expenses",
    resolvePath: (_request, context) => {
      const pathParam = context.params?.path;
      const segments = Array.isArray(pathParam)
        ? pathParam
        : pathParam
          ? [pathParam]
          : [];
      return segments.length > 0
        ? ["financial/expenses", ...segments].join("/")
        : "financial/expenses";
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "financial-expenses",
);

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
