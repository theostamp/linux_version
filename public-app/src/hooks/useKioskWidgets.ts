'use client';

// hooks/useKioskWidgets.ts - Fetch kiosk widgets from backend

import { useState, useEffect, useCallback, useMemo } from 'react';
import { KioskWidget, WidgetSettings } from '@/types/kiosk';

type KioskWidgetCategory = KioskWidget['category'];

interface BackendKioskWidget {
  widget_id?: string;
  id?: string;
  name: string;
  description?: string;
  category: KioskWidgetCategory;
  component: string;
  enabled: boolean;
  order?: number;
  settings?: WidgetSettings;
  created_at: string;
  updated_at: string;
  created_by: number;
}

interface KioskWidgetsResponse {
  widgets: BackendKioskWidget[];
  count: number;
  timestamp: string;
}

interface KioskConfig {
  settings: {
    slideDuration: number;
    autoSlide: boolean;
    showNavigation: boolean;
    backgroundImage?: string;
    theme: string;
  };
}

// API function to fetch kiosk widgets via Next.js API routes to avoid CORS issues.
async function fetchKioskWidgets(buildingId: number): Promise<KioskWidget[]> {
  const url = `/api/kiosk-widgets-public?building_id=${buildingId}`;
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
  return data.widgets.map((widget) => ({
    id: widget.widget_id || widget.id || 'widget',
    name: widget.name,
    description: widget.description || '',
    category: widget.category,
    component: widget.component,
    enabled: widget.enabled,
    order: widget.order || 0,
    settings: widget.settings || {},
    createdAt: new Date(widget.created_at),
    updatedAt: new Date(widget.updated_at),
    createdBy: widget.created_by
  }));
}

export function useKioskWidgets(buildingId: number | null) {
  const [widgets, setWidgets] = useState<KioskWidget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWidgets = useCallback(async () => {
    if (buildingId == null) {
      setWidgets([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedWidgets = await fetchKioskWidgets(buildingId);
      setWidgets(fetchedWidgets);
    } catch (err: unknown) {
      console.error('[useKioskWidgets] Error fetching widgets:', err);
      const message = err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση widgets';
      setError(message);

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

  // Get enabled widgets by category
  const getEnabledWidgets = useCallback((category: string) => {
    return widgets.filter(widget =>
      widget.enabled && widget.category === category
    ).sort((a, b) => a.order - b.order);
  }, [widgets]);

  // Default configuration
  const config: KioskConfig = useMemo(() => ({
    settings: {
      slideDuration: 10, // 10 seconds
      autoSlide: true,
      showNavigation: true,
      theme: 'default'
    }
  }), []);

  return {
    widgets,
    isLoading,
    error,
    refetch,
    getEnabledWidgets,
    config
  };
}
