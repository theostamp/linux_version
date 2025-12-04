import { createTenantProxyHandlers, resolveParams } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "projects",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const pathParam = params?.path;
      const segments = Array.isArray(pathParam)
        ? pathParam
        : pathParam
          ? [pathParam]
          : [];
      return segments.length > 0
        ? ["projects/projects", ...segments].join("/")
        : "projects/projects";
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

