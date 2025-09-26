'use client';

import { useState, useEffect, useCallback } from 'react';
import { KioskWidget, WidgetConfig, DEFAULT_WIDGET_CONFIG } from '@/types/kiosk-widgets';
import { getApiBaseUrl } from '@/lib/api';

export function useKioskWidgets(buildingId?: number) {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load widget configuration
  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load from localStorage first
      if (typeof window !== 'undefined') {
        const storageKey = buildingId ? `kiosk_config_${buildingId}` : 'kiosk_config_default';
        const savedConfig = localStorage.getItem(storageKey);

        if (savedConfig) {
          try {
            const parsedConfig = JSON.parse(savedConfig);
            console.log('📂 Loaded config from localStorage:', parsedConfig);
            setConfig(parsedConfig);
            setIsLoading(false);
            return;
          } catch (e) {
            console.error('Failed to parse saved config:', e);
          }
        }
      }

      // If no saved config, use default
      console.log('📦 Using default config');
      setConfig(DEFAULT_WIDGET_CONFIG);

      // Later we can add API call here when backend is ready
      /*
      if (buildingId) {
        const response = await fetch(`/api/kiosk/widgets/config?building_id=${buildingId}`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      }
      */
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
    console.log('💾 Saving config:', newConfig);

    // Update local state
    setConfig(newConfig);

    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      const storageKey = buildingId ? `kiosk_config_${buildingId}` : 'kiosk_config_default';
      localStorage.setItem(storageKey, JSON.stringify(newConfig));
      console.log('✅ Config saved to localStorage:', storageKey);
    }

    // TODO: Save to API when backend endpoint is implemented
    // For now, we only use localStorage
    // if (buildingId) {
    //   try {
    //     const apiBaseUrl = getApiBaseUrl();
    //     const response = await fetch(`${apiBaseUrl}/kiosk/widgets/config`, {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Bearer ${localStorage.getItem('access')}`,
    //       },
    //       body: JSON.stringify({
    //         building_id: buildingId,
    //         config: newConfig,
    //       }),
    //     });
    //
    //     if (response.ok) {
    //       console.log('✅ Config saved to API successfully');
    //       return true;
    //     } else {
    //       const errorData = await response.json();
    //       console.error('❌ API save failed:', errorData);
    //       setError(errorData.message || 'Αποτυχία αποθήκευσης ρυθμίσεων');
    //       return false;
    //     }
    //   } catch (err) {
    //     console.error('Failed to save widget config to API:', err);
    //     setError('Αποτυχία αποθήκευσης ρυθμίσεων');
    //     return false;
    //   }
    // }

    return true;
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
  const updateWidgetSettings = useCallback(async (widgetId: string, updates: Record<string, any>) => {
    console.log('🔧 Updating widget settings:', { widgetId, updates });

    const newConfig = {
      ...config,
      widgets: config.widgets.map(widget =>
        widget.id === widgetId
          ? {
              ...widget,
              ...updates,  // Apply updates directly to widget (for gridPosition, etc.)
              settings: updates.settings ? { ...widget.settings, ...updates.settings } : widget.settings
            }
          : widget
      ),
    };

    console.log('📝 New config after update:', newConfig);
    setConfig(newConfig); // Update local state immediately for better UX

    // Save the updated config
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
