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
  refreshProjectsData,
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

  const refreshProjects = useCallback(async () => {
    await refreshProjectsData();
  }, []);

  const refreshAll = useCallback(async () => {
    await refreshAllData();
  }, []);

  const triggerCustomRefresh = useCallback((scope: 'all' | 'financial' | 'buildings' | 'projects' = 'all') => {
    triggerRefresh(scope);
  }, []);

  return {
    refreshFinancial,
    refreshBuildings,
    refreshProjects,
    refreshAll,
    triggerCustomRefresh,
  };
}

