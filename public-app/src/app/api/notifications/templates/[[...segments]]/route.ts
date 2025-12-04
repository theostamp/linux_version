import { createTenantProxyHandlers, resolveParams } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "notifications-templates",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const rawSegments = params?.segments;
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


