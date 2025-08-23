import { useState, useEffect, useCallback } from 'react';
import { makeRequestWithRetry } from '@/lib/api';

interface Building {
  id: number;
  name: string;
  management_fee_per_apartment: number;
  apartments_count: number;
  reserve_fund_goal?: number;
  reserve_fund_duration_months?: number;
  reserve_fund_start_date?: string;
  reserve_fund_target_date?: string;
  current_reserve?: number;
}

interface BuildingCacheEntry {
  data: Building;
  timestamp: number;
}

// Cache for 30 seconds to reduce duplicate API calls
const CACHE_DURATION = 30 * 1000;
const buildingCache = new Map<number, BuildingCacheEntry>();

export const useBuildingCache = (buildingId: number) => {
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBuilding = useCallback(async (force = false) => {
    if (!buildingId) return;

    const now = Date.now();
    const cached = buildingCache.get(buildingId);

    // Use cache if it's fresh and not forcing refresh
    if (!force && cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`🏢 useBuildingCache: Using cached data for building ${buildingId}`);
      setBuilding(cached.data);
      setLoading(false);
      setError(null);
      return cached.data;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🏢 useBuildingCache: Fetching fresh data for building ${buildingId}`);
      const response = await makeRequestWithRetry({
        method: 'get',
        url: `/buildings/list/${buildingId}/`
      });

      const buildingData = response.data;
      
      // Cache the result
      buildingCache.set(buildingId, {
        data: buildingData,
        timestamp: now
      });

      setBuilding(buildingData);
      setLoading(false);
      return buildingData;
    } catch (err) {
      console.error(`🏢 useBuildingCache: Error fetching building ${buildingId}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      return null;
    }
  }, [buildingId]);

  // Invalidate cache function
  const invalidateCache = useCallback(() => {
    buildingCache.delete(buildingId);
    fetchBuilding(true);
  }, [buildingId, fetchBuilding]);

  // Fetch on mount or when buildingId changes
  useEffect(() => {
    fetchBuilding();
  }, [fetchBuilding]);

  return {
    building,
    loading,
    error,
    refetch: () => fetchBuilding(true),
    invalidateCache
  };
};

// Export function to clear all cache
export const clearBuildingCache = () => {
  buildingCache.clear();
  console.log('🏢 useBuildingCache: Cache cleared');
};

// Export function to get cached building without hook
export const getCachedBuilding = (buildingId: number): Building | null => {
  const cached = buildingCache.get(buildingId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};
