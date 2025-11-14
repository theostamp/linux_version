import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-dashboard-apartment-balances",
    resolvePath: () => "financial/dashboard/apartment_balances",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "financial-dashboard-apartment-balances",
);

export { GET, OPTIONS };
