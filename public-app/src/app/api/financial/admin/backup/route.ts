import { createTenantProxyHandlers } from '../../../_utils/tenantProxy';
import { exportHandlers } from '../../../_utils/exportHandlers';

const methods = ['GET', 'POST', 'OPTIONS'] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: 'financial-admin-backup',
    resolvePath: () => 'financial/admin/backup',
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, OPTIONS } = exportHandlers(
  handlers,
  methods,
  'financial-admin-backup',
);

export { GET, POST, OPTIONS };

