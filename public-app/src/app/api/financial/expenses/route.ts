import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-expenses",
    resolvePath: () => "financial/expenses",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "financial-expenses",
);

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
