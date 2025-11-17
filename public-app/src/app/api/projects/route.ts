import { createTenantProxyHandlers } from "../_utils/tenantProxy";
import { exportHandlers } from "../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "projects",
    resolvePath: () => "projects",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(
  handlers,
  methods,
  "projects",
);

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

