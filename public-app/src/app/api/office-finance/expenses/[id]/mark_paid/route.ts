import { createTenantProxyHandlers } from "../../../../_utils/tenantProxy";
import { exportHandlers } from "../../../../_utils/exportHandlers";

const methods = ["POST", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "office-finance-expense-mark-paid",
    resolvePath: (_request, context) => {
      const id = (context.params as { id: string }).id;
      return `office-finance/expenses/${id}/mark_paid`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { POST, OPTIONS } = exportHandlers(handlers, methods, "office-finance-expense-mark-paid");

export { POST, OPTIONS };

