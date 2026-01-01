'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { Building } from '@/lib/api';

interface BuildingCacheEntry {
  data: Building;
  timestamp: number;
}

// Cache for 30 seconds to reduce duplicate API calls
const CACHE_DURATION = 30 * 1000;
const buildingCache = new Map<number, BuildingCacheEntry>();

export const useBuildingCache = (buildingId: number | null) => {
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
      const buildingData = await apiGet<Building>(`/buildings/${buildingId}/`);

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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, [buildingId]);

  // Invalidate cache function
  const invalidateCache = useCallback(() => {
    if (buildingId) {
      buildingCache.delete(buildingId);
      fetchBuilding(true);
    }
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
