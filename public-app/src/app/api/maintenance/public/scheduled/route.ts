import { createTenantProxyHandlers } from "@/app/api/_utils/tenantProxy";
import { exportHandlers } from "@/app/api/_utils/exportHandlers";

const methods = ["GET", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "maintenance-public-scheduled",
    resolvePath: () => "maintenance/public/scheduled",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "maintenance-public-scheduled",
);

export { GET, OPTIONS };
