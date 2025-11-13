import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "obligations-summary",
    resolvePath: () => "obligations/summary",
  },
  methods,
);

const { GET, OPTIONS } = exportHandlers(handlers, methods, "obligations-summary");

export { GET, OPTIONS };


