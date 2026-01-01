import { createTenantProxyHandlers } from "@/app/api/_utils/tenantProxy";
import { exportHandlers } from "@/app/api/_utils/exportHandlers";

const methods = ["GET", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "billing-plans",
    resolvePath: () => "billing/plans",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, OPTIONS } = exportHandlers(handlers, methods, "billing-plans");

export { GET, OPTIONS };
