import { createTenantProxyHandlers } from '../../../_utils/tenantProxy';
import { exportHandlers } from '../../../_utils/exportHandlers';

const methods = ['GET', 'POST', 'OPTIONS'] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: 'financial-admin-database-cleanup',
    resolvePath: () => 'financial/admin/database-cleanup',
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, OPTIONS } = exportHandlers(
  handlers,
  methods,
  'financial-admin-database-cleanup',
);

export { GET, POST, OPTIONS };
