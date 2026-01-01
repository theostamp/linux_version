import { createTenantProxyHandlers } from "@/app/api/_utils/tenantProxy";
import { exportHandlers } from "@/app/api/_utils/exportHandlers";

const methods = ["GET", "POST", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "maintenance-scheduled",
    resolvePath: () => "maintenance/scheduled",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, OPTIONS } = exportHandlers(handlers, methods, "maintenance-scheduled");

export { GET, POST, OPTIONS };
