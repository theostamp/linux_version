import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "buildings/public",
    resolvePath: (_request, _context) => "buildings/public",
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET } = exportHandlers(handlers, methods, "buildings/public");

export { GET };
