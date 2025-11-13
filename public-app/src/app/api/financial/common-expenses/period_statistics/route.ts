import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-common-expenses-period-statistics",
    resolvePath: () => "financial/common-expenses/period-statistics",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, OPTIONS } = exportHandlers(handlers, methods, "financial-common-expenses-period-statistics");

export { GET, OPTIONS };

