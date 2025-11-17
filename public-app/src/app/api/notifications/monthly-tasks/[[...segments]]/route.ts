import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "notifications-monthly-tasks",
    resolvePath: (_request, context) => {
      const rawSegments = context.params?.segments;
      const segments = Array.isArray(rawSegments)
        ? rawSegments
        : rawSegments
          ? [rawSegments]
          : [];
      const suffix = segments.length ? `/${segments.join("/")}` : "";
      return `notifications/monthly-tasks${suffix}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const exported = exportHandlers(handlers, methods, "notifications-monthly-tasks");

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exported;

