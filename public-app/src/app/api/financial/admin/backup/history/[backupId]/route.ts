import { createTenantProxyHandlers } from '../../../../../_utils/tenantProxy';
import { exportHandlers } from '../../../../../_utils/exportHandlers';

const methods = ['GET', 'DELETE', 'OPTIONS'] as const;

const handlers = createTenantProxyHandlers(
  {
    logLabel: 'financial-admin-backup-history-detail',
    resolvePath: (_request, context) => {
      const backupId = context.params?.backupId;
      if (!backupId || Array.isArray(backupId)) {
        throw new Error('[financial-admin-backup-history-detail] Missing backupId param');
      }
      return `financial/admin/backup/history/${backupId}`;
    },
    ensureTrailingSlash: true,
  },
  methods,
);

const { GET, DELETE, OPTIONS } = exportHandlers(
  handlers,
  methods,
  'financial-admin-backup-history-detail',
);

export { GET, DELETE, OPTIONS };

