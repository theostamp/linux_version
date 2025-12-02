import { createTenantProxyHandlers } from '../../../_utils/tenantProxy';
import { exportHandlers } from '../../../_utils/exportHandlers';

const methods = ['GET', 'POST', 'OPTIONS'] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: 'financial-admin-restore',
    resolvePath: () => 'financial/admin/restore',
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, POST, OPTIONS } = exportHandlers(
  handlers,
  methods,
  'financial-admin-restore',
);

export { GET, POST, OPTIONS };

