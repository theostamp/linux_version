import { createTenantProxyHandlers } from "@/app/api/_utils/tenantProxy";
import { exportHandlers } from "@/app/api/_utils/exportHandlers";

const methods = ["GET", "POST", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-receipts",
    resolvePath: () => "financial/receipts",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "financial-receipts",
);

export { GET, POST, OPTIONS };
