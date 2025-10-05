// hooks/useKioskWidgets.ts - Fetch kiosk widgets from backend

import { useState, useEffect, useCallback } from 'react';
import { KioskWidget } from '@/types/kiosk';

interface KioskWidgetsResponse {
  widgets: any[];
  count: number;
  timestamp: string;
}

// Simple API get function for kiosk widgets (no auth required)
async function fetchKioskWidgets(buildingId: number): Promise<KioskWidget[]> {
  const backendUrl = 'http://localhost:18000';
  const url = `${backendUrl}/api/kiosk/public/configs/?building_id=${buildingId}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data: KioskWidgetsResponse = await response.json();

  // Transform backend format to frontend KioskWidget format
  return data.widgets.map((w: any) => ({
    id: w.widget_id || w.id,
    name: w.name,
    description: w.description || '',
    category: w.category as 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets',
    component: w.component,
    enabled: w.enabled,
    order: w.order || 0,
    settings: w.settings || {},
    createdAt: new Date(w.created_at),
    updatedAt: new Date(w.updated_at),
    createdBy: w.created_by
  }));
}

export function useKioskWidgets(buildingId: number | null) {
  const [widgets, setWidgets] = useState<KioskWidget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWidgets = useCallback(async () => {
    if (!buildingId) {
      setWidgets([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedWidgets = await fetchKioskWidgets(buildingId);
      setWidgets(fetchedWidgets);
    } catch (err: any) {
      console.error('[useKioskWidgets] Error fetching widgets:', err);
      setError(err.message || 'Σφάλμα κατά τη φόρτωση widgets');

      // Fallback to empty array on error
      setWidgets([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  // Load widgets when building changes
  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const refetch = useCallback(() => {
    return loadWidgets();
  }, [loadWidgets]);

  return {
    widgets,
    isLoading,
    error,
    refetch
  };
}
