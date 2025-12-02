import { createTenantProxyHandlers } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "office-finance-income-detail",
    resolvePath: (_request, context) => {
      const id = (context.params as { id: string }).id;
      return `office-finance/incomes/${id}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "office-finance-income-detail");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

