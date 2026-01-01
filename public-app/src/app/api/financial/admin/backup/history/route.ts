import { createTenantProxyHandlers } from '../../../../_utils/tenantProxy';
import { exportHandlers } from '../../../../_utils/exportHandlers';

const methods = ['GET', 'OPTIONS'] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: 'financial-admin-backup-history',
    resolvePath: () => 'financial/admin/backup/history',
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, OPTIONS } = exportHandlers(
  handlers,
  methods,
  'financial-admin-backup-history',
);

export { GET, OPTIONS };
