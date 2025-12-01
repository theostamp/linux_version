import { createTenantProxyHandlers } from "../../../../_utils/tenantProxy";
import { exportHandlers } from "../../../../_utils/exportHandlers";

const methods = ["POST", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "office-finance-income-mark-received",
    resolvePath: (_request, context) => {
      const id = (context.params as { id: string }).id;
      return `office-finance/incomes/${id}/mark_received`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { POST, OPTIONS } = exportHandlers(handlers, methods, "office-finance-income-mark-received");

export { POST, OPTIONS };

