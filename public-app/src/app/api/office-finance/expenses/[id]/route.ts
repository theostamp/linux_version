import { createTenantProxyHandlers, resolveParams } from "../../../_utils/tenantProxy";
import { exportHandlers } from "../../../_utils/exportHandlers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "office-finance-expense-detail",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const id = params?.id as string;
      return `office-finance/expenses/${id}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = exportHandlers(handlers, methods, "office-finance-expense-detail");

export { GET, POST, PUT, PATCH, DELETE, OPTIONS };

