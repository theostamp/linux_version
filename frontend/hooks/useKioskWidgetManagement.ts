// hooks/useKioskWidgetManagement.ts - Manage kiosk widgets with backend API

import { useState, useEffect, useCallback } from 'react';
import { KioskWidget } from '@/types/kiosk';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/components/contexts/AuthContext';

interface KioskWidgetsResponse {
  widgets: any[];
  count: number;
}

/**
 * Hook for managing kiosk widgets with backend persistence
 */
export function useKioskWidgetManagement(buildingId: number | null) {
  const [widgets, setWidgets] = useState<KioskWidget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthReady, isAuthenticated } = useAuth();

  // Fetch widgets from backend
  const fetchWidgets = useCallback(async () => {
    // Don't fetch if auth is not ready or user is not authenticated
    if (!isAuthReady || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    if (!buildingId) {
      setWidgets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use authenticated endpoint for management (includes disabled widgets)
      const response = await apiClient.get<KioskWidgetsResponse>(
        `/api/kiosk/configs/?building_id=${buildingId}`
      );

      // Transform backend format to frontend KioskWidget format
      const backendWidgets = response.data?.widgets || [];
      const transformedWidgets: KioskWidget[] = backendWidgets.map((w: any) => ({
        id: w.id, // Backend already sends 'id' (converted from widget_id)
        name: w.name,
        greekName: w.greekName,
        description: w.description || '',
        greekDescription: w.greekDescription,
        category: w.category as 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets',
        component: w.component,
        icon: w.icon,
        enabled: w.enabled,
        order: w.order || 0,
        settings: w.settings || {},
        type: w.isCustom ? 'custom' : 'system',
        dataSource: w.dataSource || '',
        refreshInterval: w.settings?.refreshInterval,
        createdAt: new Date(w.createdAt),
        updatedAt: new Date(w.lastModified || w.createdAt),
        lastModified: new Date(w.lastModified || w.createdAt)
      }));

      setWidgets(transformedWidgets);
    } catch (err: any) {
      console.error('[useKioskWidgetManagement] Error fetching widgets:', err);
      setError(err.message || 'Σφάλμα κατά τη φόρτωση widgets');
      setWidgets([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, isAuthReady, isAuthenticated]);

  // Toggle widget enabled status
  const toggleWidget = useCallback(async (widgetId: string, enabled: boolean) => {
    try {
      // Optimistic update
      setWidgets(prev => prev.map(widget =>
        widget.id === widgetId ? { ...widget, enabled } : widget
      ));

      // Send update to backend
      await apiClient.patch(`/api/kiosk/configs/${widgetId}/`, {
        enabled
      });

      console.log(`✓ Widget ${widgetId} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      console.error('[useKioskWidgetManagement] Error toggling widget:', err);

      // Revert optimistic update on error
      setWidgets(prev => prev.map(widget =>
        widget.id === widgetId ? { ...widget, enabled: !enabled } : widget
      ));

      setError(err.message || 'Σφάλμα κατά την ενημέρωση widget');
      throw err;
    }
  }, []);

  // Update widget
  const updateWidget = useCallback(async (widgetId: string, updates: Partial<KioskWidget>) => {
    try {
      // Optimistic update
      setWidgets(prev => prev.map(widget =>
        widget.id === widgetId ? { ...widget, ...updates, updatedAt: new Date() } : widget
      ));

      // Send update to backend
      await apiClient.patch(`/api/kiosk/configs/${widgetId}/`, updates);

      console.log(`✓ Widget ${widgetId} updated`);
    } catch (err: any) {
      console.error('[useKioskWidgetManagement] Error updating widget:', err);

      // Refetch to get correct state
      await fetchWidgets();

      setError(err.message || 'Σφάλμα κατά την ενημέρωση widget');
      throw err;
    }
  }, [fetchWidgets]);

  // Delete widget
  const deleteWidget = useCallback(async (widgetId: string) => {
    try {
      // Optimistic delete
      setWidgets(prev => prev.filter(widget => widget.id !== widgetId));

      // Send delete to backend
      await apiClient.delete(`/api/kiosk/configs/${widgetId}/`);

      console.log(`✓ Widget ${widgetId} deleted`);
    } catch (err: any) {
      console.error('[useKioskWidgetManagement] Error deleting widget:', err);

      // Refetch to get correct state
      await fetchWidgets();

      setError(err.message || 'Σφάλμα κατά τη διαγραφή widget');
      throw err;
    }
  }, [fetchWidgets]);

  // Create widget
  const createWidget = useCallback(async (widgetData: Partial<KioskWidget>) => {
    try {
      const response = await apiClient.post('/api/kiosk/configs/', {
        ...widgetData,
        buildingId: buildingId
      });

      // Refetch to get the new widget with all fields
      await fetchWidgets();

      console.log(`✓ Widget created`);
      return response;
    } catch (err: any) {
      console.error('[useKioskWidgetManagement] Error creating widget:', err);
      setError(err.message || 'Σφάλμα κατά τη δημιουργία widget');
      throw err;
    }
  }, [buildingId, fetchWidgets]);

  // Load widgets on mount or when buildingId changes
  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  return {
    widgets,
    isLoading,
    error,
    refetch: fetchWidgets,
    toggleWidget,
    updateWidget,
    deleteWidget,
    createWidget,
  };
}
