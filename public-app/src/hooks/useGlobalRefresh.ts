/**
 * Hook for using the global refresh system
 * 
 * Usage:
 * ```tsx
 * const { refreshFinancial, refreshBuildings, refreshAll } = useGlobalRefresh();
 * 
 * // In your component:
 * <Button onClick={refreshFinancial}>Refresh Data</Button>
 * ```
 */

import { useCallback } from 'react';
import {
  refreshFinancialData,
  refreshBuildingData,
  refreshAllData,
  triggerRefresh,
} from '@/lib/globalRefresh';

export function useGlobalRefresh() {
  const refreshFinancial = useCallback(async () => {
    await refreshFinancialData();
  }, []);

  const refreshBuildings = useCallback(async () => {
    await refreshBuildingData();
  }, []);

  const refreshAll = useCallback(async () => {
    await refreshAllData();
  }, []);

  const triggerCustomRefresh = useCallback((scope: 'all' | 'financial' | 'buildings' = 'all') => {
    triggerRefresh(scope);
  }, []);

  return {
    refreshFinancial,
    refreshBuildings,
    refreshAll,
    triggerCustomRefresh,
  };
}

