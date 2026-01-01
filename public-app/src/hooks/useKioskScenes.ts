'use client';

// hooks/useKioskScenes.ts - Fetch active kiosk scenes from backend

import { useState, useEffect, useCallback } from 'react';

export interface WidgetPlacement {
  id: number;
  sceneId: number;
  widgetId: string;
  gridRowStart: number;
  gridColStart: number;
  gridRowEnd: number;
  gridColEnd: number;
  zIndex: number;
  widget: {
    id: string;
    name: string;
    greekName: string;
    category: string;
    component: string;
    enabled: boolean;
    settings: Record<string, unknown>;
  };
}

export interface KioskScene {
  id: number;
  buildingId: number;
  name: string;
  order: number;
  durationSeconds: number;
  transition: string;
  isEnabled: boolean;
  activeStartTime: string | null;
  activeEndTime: string | null;
  settings?: Record<string, unknown> | null;
  placements: WidgetPlacement[];
  createdAt: string;
  updatedAt: string;
}

interface ScenesResponse {
  scenes: KioskScene[];
  count: number;
  timestamp: string;
}

// API function to fetch active scenes
async function fetchActiveScenes(buildingId: number): Promise<KioskScene[]> {
  const url = `/api/kiosk-scenes-active?building_id=${buildingId}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data: ScenesResponse = await response.json();
  return data.scenes;
}

export function useKioskScenes(buildingId: number | null) {
  const [scenes, setScenes] = useState<KioskScene[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScenes = useCallback(async () => {
    if (buildingId == null) {
      setScenes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedScenes = await fetchActiveScenes(buildingId);
      setScenes(fetchedScenes);
    } catch (err: unknown) {
      console.error('[useKioskScenes] Error fetching scenes:', err);
      const message = err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση σκηνών';
      setError(message);

      // Fallback to empty array on error
      setScenes([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  // Load scenes when building changes
  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  // Auto-refresh scenes every 5 minutes
  useEffect(() => {
    if (buildingId == null) return;

    const interval = setInterval(() => {
      loadScenes();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loadScenes, buildingId]);

  const refetch = useCallback(() => {
    return loadScenes();
  }, [loadScenes]);

  return {
    scenes,
    isLoading,
    error,
    refetch
  };
}
