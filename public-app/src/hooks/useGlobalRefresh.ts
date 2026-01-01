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
  refreshAnnouncementsData,
  refreshRequestsData,
  refreshVotesData,
  refreshCommunityData,
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

  const refreshAnnouncements = useCallback(async () => {
    await refreshAnnouncementsData();
  }, []);

  const refreshRequests = useCallback(async () => {
    await refreshRequestsData();
  }, []);

  const refreshVotes = useCallback(async () => {
    await refreshVotesData();
  }, []);

  const refreshCommunity = useCallback(async () => {
    await refreshCommunityData();
  }, []);

  const refreshAll = useCallback(async () => {
    await refreshAllData();
  }, []);

  const triggerCustomRefresh = useCallback((
    scope: 'all' | 'financial' | 'buildings' | 'projects' | 'announcements' | 'requests' | 'votes' | 'community' = 'all'
  ) => {
    triggerRefresh(scope);
  }, []);

  return {
    refreshFinancial,
    refreshBuildings,
    refreshProjects,
    refreshAnnouncements,
    refreshRequests,
    refreshVotes,
    refreshCommunity,
    refreshAll,
    triggerCustomRefresh,
  };
}
