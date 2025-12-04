import { createTenantProxyHandlers, resolveParams } from "../../../../_utils/tenantProxy";
import { exportHandlers } from "../../../../_utils/exportHandlers";

const methods = ["POST", "OPTIONS"] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: "office-finance-income-mark-received",
    resolvePath: async (_request, context) => {
      // Next.js 15+ requires awaiting params
      const params = await resolveParams(context.params);
      const id = params?.id as string;
      return `office-finance/incomes/${id}/mark_received`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { POST, OPTIONS } = exportHandlers(handlers, methods, "office-finance-income-mark-received");

export { POST, OPTIONS };

