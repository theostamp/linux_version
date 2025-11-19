import { createTenantProxyHandlers } from "@/app/api/_utils/tenantProxy";
import { exportHandlers } from "@/app/api/_utils/exportHandlers";

const methods = ["GET", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-reports-transaction-history",
    resolvePath: () => "financial/reports/transaction_history",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "financial-reports-transaction-history",
);

export { GET, OPTIONS };


