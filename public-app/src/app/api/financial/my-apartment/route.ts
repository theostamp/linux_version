import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "financial-my-apartment",
    resolvePath: () => "financial/my-apartment",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "financial-my-apartment",
);

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
