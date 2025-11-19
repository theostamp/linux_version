import { createTenantProxyHandlers } from "@/app/api/_utils/tenantProxy";
import { exportHandlers } from "@/app/api/_utils/exportHandlers";

const methods = ["GET", "POST", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-meter-readings",
    resolvePath: () => "financial/meter-readings",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "financial-meter-readings",
);

export { GET, POST, OPTIONS };


