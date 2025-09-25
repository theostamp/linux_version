'use client';

import { useState, useEffect, useCallback } from 'react';
import { KioskWidget, WidgetConfig, DEFAULT_WIDGET_CONFIG } from '@/types/kiosk-widgets';

export function useKioskWidgets(buildingId?: number) {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load widget configuration
  const loadConfig = useCallback(async () => {
    if (!buildingId) {
      setConfig(DEFAULT_WIDGET_CONFIG);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/kiosk/widgets/config?building_id=${buildingId}`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else {
        // If no config exists, use default
        setConfig(DEFAULT_WIDGET_CONFIG);
      }
    } catch (err) {
      console.error('Failed to load widget config:', err);
      setError('Αποτυχία φόρτωσης ρυθμίσεων widgets');
      setConfig(DEFAULT_WIDGET_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  // Save widget configuration
  const saveConfig = useCallback(async (newConfig: WidgetConfig) => {
    if (!buildingId) {
      setConfig(newConfig);
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`/api/kiosk/widgets/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          config: newConfig,
        }),
      });

      if (response.ok) {
        setConfig(newConfig);
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Αποτυχία αποθήκευσης ρυθμίσεων');
        return false;
      }
    } catch (err) {
      console.error('Failed to save widget config:', err);
      setError('Αποτυχία αποθήκευσης ρυθμίσεων');
      return false;
    }
  }, [buildingId]);

  // Update widget enabled state
  const toggleWidget = useCallback(async (widgetId: string, enabled: boolean) => {
    const newConfig = {
      ...config,
      widgets: config.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, enabled } : widget
      ),
    };
    
    const success = await saveConfig(newConfig);
    return success;
  }, [config, saveConfig]);

  // Update widget order
  const updateWidgetOrder = useCallback(async (widgetId: string, newOrder: number) => {
    const newConfig = {
      ...config,
      widgets: config.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, order: newOrder } : widget
      ),
    };
    
    const success = await saveConfig(newConfig);
    return success;
  }, [config, saveConfig]);

  // Update widget settings
  const updateWidgetSettings = useCallback(async (widgetId: string, settings: Record<string, any>) => {
    const newConfig = {
      ...config,
      widgets: config.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, settings: { ...widget.settings, ...settings } } : widget
      ),
    };
    
    const success = await saveConfig(newConfig);
    return success;
  }, [config, saveConfig]);

  // Update global settings
  const updateGlobalSettings = useCallback(async (settings: Partial<WidgetConfig['settings']>) => {
    const newConfig = {
      ...config,
      settings: { ...config.settings, ...settings },
    };
    
    const success = await saveConfig(newConfig);
    return success;
  }, [config, saveConfig]);

  // Reset to default configuration
  const resetToDefault = useCallback(async () => {
    const success = await saveConfig(DEFAULT_WIDGET_CONFIG);
    return success;
  }, [saveConfig]);

  // Get enabled widgets by category
  const getEnabledWidgets = useCallback((category: KioskWidget['category']) => {
    return config.widgets
      .filter(widget => widget.category === category && widget.enabled)
      .sort((a, b) => a.order - b.order);
  }, [config.widgets]);

  // Get all enabled widgets
  const getAllEnabledWidgets = useCallback(() => {
    return config.widgets
      .filter(widget => widget.enabled)
      .sort((a, b) => a.order - b.order);
  }, [config.widgets]);

  // Save complete config
  const saveCompleteConfig = useCallback(async (newConfig: WidgetConfig) => {
    const success = await saveConfig(newConfig);
    return success;
  }, [saveConfig]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    isLoading,
    error,
    toggleWidget,
    updateWidgetOrder,
    updateWidgetSettings,
    updateGlobalSettings,
    resetToDefault,
    getEnabledWidgets,
    getAllEnabledWidgets,
    saveConfig: saveCompleteConfig,
    loadConfig,
  };
}
