import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiPublic } from '@/lib/apiPublic';

export interface KioskWidget {
  id: string;
  name: string;
  description: string;
  category: 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets';
  enabled: boolean;
  order: number;
  settings: Record<string, any>;
  gridPosition?: {
    row: number;
    col: number;
    rowSpan: number;
    colSpan: number;
  };
}

export interface KioskSettings {
  slideDuration: number;
  refreshInterval: number;
  autoRefresh: boolean;
}

export interface KioskConfig {
  id?: number;
  building: number;
  building_name?: string;
  building_address?: string;
  config: {
    widgets: KioskWidget[];
    settings: KioskSettings;
    canvasLayout?: {
      gridSize: {
        rows: number;
        cols: number;
      };
      widgetPositions: Record<string, any>;
    };
  };
  widgets: KioskWidget[];
  settings: KioskSettings;
  enabled_widgets_count: number;
  total_widgets_count: number;
  created_at?: string;
  updated_at?: string;
}

export function useKioskWidgets(buildingId?: number) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch kiosk configuration
  const { data: config, isLoading: isConfigLoading, error: configError } = useQuery({
    queryKey: ['kiosk-config', buildingId],
    queryFn: async () => {
      if (!buildingId) {
        // Return default config if no building ID
        return {
          building: buildingId || 0,
          config: {
            widgets: getDefaultWidgets(),
            settings: {
              slideDuration: 10,
              refreshInterval: 30,
              autoRefresh: true
            }
          },
          widgets: getDefaultWidgets(),
          settings: {
            slideDuration: 10,
            refreshInterval: 30,
            autoRefresh: true
          },
          enabled_widgets_count: getDefaultWidgets().filter(w => w.enabled).length,
          total_widgets_count: getDefaultWidgets().length
        };
      }

      try {
        // Use direct axios call with correct URL for kiosk
        const hostname = window.location.hostname;
        const apiUrl = `http://${hostname}:18000/api`;
        console.log('[useKioskWidgets] Making API call to:', `${apiUrl}/kiosk/public/configs/get_by_building/?building_id=${buildingId}`);
        
        const response = await fetch(`${apiUrl}/kiosk/public/configs/get_by_building/?building_id=${buildingId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('[useKioskWidgets] API response:', data);
        return data;
      } catch (error: any) {
        // If no config exists, return default
        if (error.response?.status === 404) {
          return {
            building: buildingId,
            config: {
              widgets: getDefaultWidgets(),
              settings: {
                slideDuration: 10,
                refreshInterval: 30,
                autoRefresh: true
              }
            },
            widgets: getDefaultWidgets(),
            settings: {
              slideDuration: 10,
              refreshInterval: 30,
              autoRefresh: true
            },
            enabled_widgets_count: getDefaultWidgets().filter(w => w.enabled).length,
            total_widgets_count: getDefaultWidgets().length
          };
        }
        throw error;
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create/Update configuration mutation
  const createOrUpdateMutation = useMutation({
    mutationFn: async (configData: Partial<KioskConfig>) => {
      if (!buildingId) throw new Error('Building ID is required');
      
      const response = await api.post('/kiosk/configs/', {
        building_id: buildingId,
        config: configData.config || config?.config
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-config', buildingId] });
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to save configuration');
    }
  });

  // Toggle widget mutation
  const toggleWidgetMutation = useMutation({
    mutationFn: async ({ widgetId, enabled }: { widgetId: string; enabled: boolean }) => {
      if (!buildingId) throw new Error('Building ID is required');
      
      const response = await api.post(`/kiosk/configs/${buildingId}/toggle_widget/`, {
        widget_id: widgetId,
        enabled
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-config', buildingId] });
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to toggle widget');
    }
  });

  // Update widget order mutation
  const updateWidgetOrderMutation = useMutation({
    mutationFn: async ({ widgetId, order }: { widgetId: string; order: number }) => {
      if (!buildingId) throw new Error('Building ID is required');
      
      const response = await api.post(`/kiosk/configs/${buildingId}/update_widget_order/`, {
        widget_id: widgetId,
        order
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-config', buildingId] });
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to update widget order');
    }
  });

  // Update widget settings mutation
  const updateWidgetSettingsMutation = useMutation({
    mutationFn: async ({ widgetId, settings }: { widgetId: string; settings: Record<string, any> }) => {
      if (!buildingId) throw new Error('Building ID is required');
      
      const response = await api.post(`/kiosk/configs/${buildingId}/update_widget_settings/`, {
        widget_id: widgetId,
        settings
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-config', buildingId] });
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to update widget settings');
    }
  });

  // Update global settings mutation
  const updateGlobalSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<KioskSettings>) => {
      if (!buildingId) throw new Error('Building ID is required');
      
      const response = await api.post(`/kiosk/configs/${buildingId}/update_global_settings/`, {
        settings
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-config', buildingId] });
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to update global settings');
    }
  });

  // Reset to default mutation
  const resetToDefaultMutation = useMutation({
    mutationFn: async () => {
      if (!buildingId) throw new Error('Building ID is required');
      
      const response = await api.post(`/kiosk/configs/${buildingId}/reset_to_default/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-config', buildingId] });
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to reset to default');
    }
  });

  // Helper functions
  const toggleWidget = useCallback(async (widgetId: string, enabled: boolean): Promise<boolean> => {
    try {
      await toggleWidgetMutation.mutateAsync({ widgetId, enabled });
      return true;
    } catch (error) {
      console.error('Failed to toggle widget:', error);
      return false;
    }
  }, [toggleWidgetMutation]);

  const updateWidgetOrder = useCallback(async (widgetId: string, order: number): Promise<boolean> => {
    try {
      await updateWidgetOrderMutation.mutateAsync({ widgetId, order });
      return true;
    } catch (error) {
      console.error('Failed to update widget order:', error);
      return false;
    }
  }, [updateWidgetOrderMutation]);

  const updateWidgetSettings = useCallback(async (widgetId: string, settings: Record<string, any>): Promise<boolean> => {
    try {
      await updateWidgetSettingsMutation.mutateAsync({ widgetId, settings });
      return true;
    } catch (error) {
      console.error('Failed to update widget settings:', error);
      return false;
    }
  }, [updateWidgetSettingsMutation]);

  const updateGlobalSettings = useCallback(async (settings: Partial<KioskSettings>): Promise<boolean> => {
    try {
      await updateGlobalSettingsMutation.mutateAsync(settings);
      return true;
    } catch (error) {
      console.error('Failed to update global settings:', error);
      return false;
    }
  }, [updateGlobalSettingsMutation]);

  const resetToDefault = useCallback(async (): Promise<boolean> => {
    try {
      await resetToDefaultMutation.mutateAsync();
      return true;
    } catch (error) {
      console.error('Failed to reset to default:', error);
      return false;
    }
  }, [resetToDefaultMutation]);

  const saveConfig = useCallback(async (configData: Partial<KioskConfig>): Promise<boolean> => {
    try {
      await createOrUpdateMutation.mutateAsync(configData);
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  }, [createOrUpdateMutation]);

  const getEnabledWidgets = useCallback((category?: string): KioskWidget[] => {
    const widgets = config?.widgets?.filter(widget => widget.enabled) || [];
    if (category) {
      return widgets.filter(widget => widget.category === category);
    }
    return widgets;
  }, [config]);

  // Clear error when building ID changes
  useEffect(() => {
    setError(null);
  }, [buildingId]);

  return {
    config: config || {
      building: buildingId || 0,
      config: {
        widgets: getDefaultWidgets(),
        settings: {
          slideDuration: 10,
          refreshInterval: 30,
          autoRefresh: true
        }
      },
      widgets: getDefaultWidgets(),
      settings: {
        slideDuration: 10,
        refreshInterval: 30,
        autoRefresh: true
      },
      enabled_widgets_count: 0,
      total_widgets_count: 0
    },
    isLoading: isConfigLoading || isLoading,
    error: error || (configError as string) || null,
    toggleWidget,
    updateWidgetOrder,
    updateWidgetSettings,
    updateGlobalSettings,
    resetToDefault,
    saveConfig,
    getEnabledWidgets,
  };
}

// Default widgets configuration
function getDefaultWidgets(): KioskWidget[] {
  console.log('[getDefaultWidgets] Creating default widgets');
  const widgets = [
    {
      id: 'dashboard_overview',
      name: 'Dashboard Overview',
      description: 'Συνολική επισκόπηση του κτιρίου',
      category: 'main_slides',
      enabled: true,
      order: 0,
      settings: {}
    },
    {
      id: 'building_statistics',
      name: 'Building Statistics',
      description: 'Στατιστικά κτιρίου',
      category: 'main_slides',
      enabled: true,
      order: 1,
      settings: {}
    },
    {
      id: 'emergency_contacts',
      name: 'Emergency Contacts',
      description: 'Τηλέφωνα έκτακτης ανάγκης',
      category: 'main_slides',
      enabled: true,
      order: 2,
      settings: {}
    },
    {
      id: 'announcements',
      name: 'Announcements',
      description: 'Ανακοινώσεις',
      category: 'main_slides',
      enabled: true,
      order: 3,
      settings: {}
    },
    {
      id: 'votes',
      name: 'Votes',
      description: 'Ψηφοφορίες',
      category: 'main_slides',
      enabled: true,
      order: 4,
      settings: {}
    },
    {
      id: 'financial_overview',
      name: 'Financial Overview',
      description: 'Οικονομική επισκόπηση',
      category: 'main_slides',
      enabled: true,
      order: 5,
      settings: {}
    },
    {
      id: 'maintenance_overview',
      name: 'Maintenance Overview',
      description: 'Συντήρηση και επισκευές',
      category: 'main_slides',
      enabled: true,
      order: 6,
      settings: {}
    },
    {
      id: 'projects_overview',
      name: 'Projects Overview',
      description: 'Έργα και προσφορές',
      category: 'main_slides',
      enabled: true,
      order: 7,
      settings: {}
    },
    {
      id: 'current_time',
      name: 'Current Time',
      description: 'Τρέχουσα ώρα και ημερομηνία',
      category: 'sidebar_widgets',
      enabled: true,
      order: 0,
      settings: {}
    },
    {
      id: 'qr_code_connection',
      name: 'QR Code Connection',
      description: 'Σύνδεση με κινητό',
      category: 'sidebar_widgets',
      enabled: true,
      order: 1,
      settings: {}
    },
    {
      id: 'weather_widget_sidebar',
      name: 'Weather Widget',
      description: 'Πρόγνωση καιρού',
      category: 'sidebar_widgets',
      enabled: true,
      order: 2,
      settings: {}
    },
    {
      id: 'internal_manager_info',
      name: 'Internal Manager Info',
      description: 'Πληροφορίες διαχειριστή',
      category: 'sidebar_widgets',
      enabled: true,
      order: 3,
      settings: {}
    },
    {
      id: 'community_message',
      name: 'Community Message',
      description: 'Μήνυμα κοινότητας',
      category: 'sidebar_widgets',
      enabled: true,
      order: 4,
      settings: {}
    },
    {
      id: 'advertising_banners_sidebar',
      name: 'Advertising Banners',
      description: 'Χρήσιμες υπηρεσίες',
      category: 'sidebar_widgets',
      enabled: true,
      order: 5,
      settings: {}
    },
    {
      id: 'weather_widget_topbar',
      name: 'Weather Top Bar',
      description: 'Καιρός στην επάνω μπάρα',
      category: 'top_bar_widgets',
      enabled: true,
      order: 0,
      settings: {}
    },
    {
      id: 'advertising_banners_topbar',
      name: 'Advertising Top Bar',
      description: 'Διαφημίσεις στην επάνω μπάρα',
      category: 'top_bar_widgets',
      enabled: true,
      order: 1,
      settings: {}
    },
    {
      id: 'news_ticker',
      name: 'News Ticker',
      description: 'Τελευταία νέα',
      category: 'special_widgets',
      enabled: true,
      order: 0,
      settings: {}
    }
  ];
  
  console.log('[getDefaultWidgets] Created', widgets.length, 'widgets');
  return widgets;
}