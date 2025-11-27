import { createTenantProxyHandlers } from "../../_utils/tenantProxy";
import { exportHandlers } from "../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

console.log("[ROUTE HANDLER] /api/office/[...path]/route.ts loaded");

const handlers = createTenantProxyHandlers(
  {
    logLabel: "office",
    resolvePath: (_request, context) => {
      const pathParams = context.params?.path;
      const pathStr = Array.isArray(pathParams) 
        ? pathParams.join('/') 
        : (pathParams || '');
        
      console.log(`[ROUTE HANDLER] /api/office/[...path] resolvePath called for: ${pathStr}`);
      return `office/${pathStr}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "office");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

