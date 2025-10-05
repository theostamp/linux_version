// hooks/useKioskWidgetManagement.ts - Manage kiosk widgets with backend API

import { useState, useEffect, useCallback } from 'react';
import { KioskWidget } from '@/types/kiosk';
import { apiClient } from '@/lib/api-client';

interface KioskWidgetsResponse {
  widgets: any[];
  count: number;
}

/**
 * Hook for managing kiosk widgets with backend persistence
 */
export function useKioskWidgetManagement(buildingId: number | null) {
  const [widgets, setWidgets] = useState<KioskWidget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch widgets from backend
  const fetchWidgets = useCallback(async () => {
    if (!buildingId) {
      setWidgets([]);
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
      const transformedWidgets: KioskWidget[] = response.widgets.map((w: any) => ({
        id: w.widget_id || w.id,
        name: w.name,
        description: w.description || '',
        category: w.category as 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets',
        component: w.component,
        enabled: w.enabled,
        order: w.order || 0,
        settings: w.settings || {},
        type: w.is_custom ? 'custom' : 'system',
        dataSource: w.data_source || '',
        refreshInterval: w.settings?.refreshInterval,
        createdAt: new Date(w.created_at),
        updatedAt: new Date(w.updated_at),
        createdBy: w.created_by
      }));

      setWidgets(transformedWidgets);
    } catch (err: any) {
      console.error('[useKioskWidgetManagement] Error fetching widgets:', err);
      setError(err.message || 'Σφάλμα κατά τη φόρτωση widgets');
      setWidgets([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

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
