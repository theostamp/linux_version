import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "notifications-templates",
    resolvePath: (_request, context) => {
      const rawSegments = context.params?.segments;
      const segments = Array.isArray(rawSegments)
        ? rawSegments
        : rawSegments
          ? [rawSegments]
          : [];
      const suffix = segments.length ? `/${segments.join("/")}` : "";
      return `notifications/templates${suffix}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const exported = exportHandlers(handlers, methods, "notifications-templates");

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exported;

