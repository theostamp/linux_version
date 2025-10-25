import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPublicInfo } from '@/lib/api';
import { fetchKioskConfig, saveKioskConfig, updateWidgetSettings as updateWidgetSettingsApi, toggleWidget as toggleWidgetApi } from '@/lib/kiosk-api';
import { 
  KioskConfig, 
  KioskSettings, 
  KioskSlide, 
  KioskWidget 
} from '@/types/kiosk';
import { 
  DEFAULT_WIDGETS, 
  DEFAULT_KIOSK_SETTINGS 
} from '@/lib/kiosk/config';
import { 
  createSlidesFromWidgets, 
  getDefaultKioskConfig
} from '@/lib/kiosk/utils';

interface UseKioskReturn {
  // Data
  data: any;
  isLoading: boolean;
  error: string | null;
  
  // Configuration
  config: KioskConfig;
  settings: KioskSettings;
  
  // Slides
  slides: KioskSlide[];
  currentSlide: number;
  
  // Actions
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  toggleAutoSlide: () => void;
  
  // Settings
  updateSettings: (settings: Partial<KioskSettings>) => Promise<boolean>;
  toggleWidget: (widgetId: string, enabled: boolean) => Promise<boolean>;
  updateWidgetSettings: (widgetId: string, settings: Record<string, any>) => Promise<boolean>;
}

export function useKiosk(buildingId?: number): UseKioskReturn {
  const queryClient = useQueryClient();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoSlideEnabled, setAutoSlideEnabled] = useState(true);

  // Fetch public info data directly
  const { 
    data, 
    isLoading: isDataLoading, 
    error: dataError 
  } = useQuery({
    queryKey: ['public-info', buildingId],
    queryFn: async () => {
      if (!buildingId) {
        throw new Error('Building ID is required');
      }
      return fetchPublicInfo(buildingId);
    },
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch kiosk configuration
  const { 
    data: config, 
    isLoading: isConfigLoading, 
    error: configError 
  } = useQuery({
    queryKey: ['kiosk-config', buildingId],
    queryFn: async () => {
      if (!buildingId) {
        return getDefaultKioskConfig(0);
      }

        try {
          const kioskConfig = await fetchKioskConfig(buildingId);
          if (!kioskConfig) {
            // Return default config if none exists
            return getDefaultKioskConfig(buildingId);
          }
          // Transform the response to match our expected format
          return {
            id: kioskConfig.id,
            building: kioskConfig.building,
            widgets: kioskConfig.widgets || [],
            settings: kioskConfig.settings || DEFAULT_KIOSK_SETTINGS,
            created_at: kioskConfig.created_at,
            updated_at: kioskConfig.updated_at
          };
        } catch (error: any) {
          console.error('Failed to fetch kiosk config:', error);
          // Return default config on error
          return getDefaultKioskConfig(buildingId);
        }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Create slides from widgets
  const slides = useMemo(() => {
    if (!config?.widgets) return [];
    return createSlidesFromWidgets(config.widgets);
  }, [config?.widgets]);

  // Settings from config
  const settings = useMemo(() => {
    return config?.settings || DEFAULT_KIOSK_SETTINGS;
  }, [config?.settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<KioskSettings>) => {
      if (!buildingId) throw new Error('Building ID is required');
      
      return saveKioskConfig(buildingId, { settings: newSettings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-config', buildingId] });
    },
    onError: (error: any) => {
      console.error('Failed to update settings:', error);
    }
  });

  // Toggle widget mutation
  const toggleWidgetMutation = useMutation({
    mutationFn: async ({ widgetId, enabled }: { widgetId: string; enabled: boolean }) => {
      if (!buildingId) throw new Error('Building ID is required');
      
      return toggleWidgetApi(buildingId, widgetId, enabled);
    }
  });

  // Update widget settings mutation
  const updateWidgetSettingsMutation = useMutation({
    mutationFn: async ({ widgetId, settings }: { widgetId: string; settings: Record<string, any> }) => {
      if (!buildingId) throw new Error('Building ID is required');
      
      return updateWidgetSettingsApi(buildingId, widgetId, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-config', buildingId] });
    },
    onError: (error: any) => {
      console.error('Failed to update widget settings:', error);
    }
  });

  // Slide navigation functions
  const nextSlide = useCallback(() => {
    if (slides.length > 1) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length > 1) {
      setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    }
  }, [slides.length]);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  }, [slides.length]);

  const toggleAutoSlide = useCallback(() => {
    setAutoSlideEnabled(prev => !prev);
  }, []);

  // Settings functions
  const updateSettings = useCallback(async (newSettings: Partial<KioskSettings>): Promise<boolean> => {
    try {
      await updateSettingsMutation.mutateAsync(newSettings);
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  }, [updateSettingsMutation]);

  const toggleWidget = useCallback(async (widgetId: string, enabled: boolean): Promise<boolean> => {
    try {
      await toggleWidgetMutation.mutateAsync({ widgetId, enabled });
      return true;
    } catch (error) {
      console.error('Failed to toggle widget:', error);
      return false;
    }
  }, [toggleWidgetMutation]);

  const updateWidgetSettings = useCallback(async (widgetId: string, widgetSettings: Record<string, any>): Promise<boolean> => {
    try {
      await updateWidgetSettingsMutation.mutateAsync({ widgetId, settings: widgetSettings });
      return true;
    } catch (error) {
      console.error('Failed to update widget settings:', error);
      return false;
    }
  }, [updateWidgetSettingsMutation]);

  // Reset current slide when slides change
  useEffect(() => {
    if (currentSlide >= slides.length && slides.length > 0) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  // Auto-slide functionality
  useEffect(() => {
    if (!autoSlideEnabled || slides.length <= 1) return;

    const interval = setInterval(() => {
      nextSlide();
    }, settings.slideDuration * 1000);

    return () => clearInterval(interval);
  }, [autoSlideEnabled, slides.length, settings.slideDuration, nextSlide]);

  return {
    // Data
    data,
    isLoading: isDataLoading || isConfigLoading,
    error: (dataError instanceof Error ? dataError.message : dataError) || configError?.message || null,
    
    // Configuration
    config: config ? {
      ...config,
      enabled_widgets_count: config.widgets?.filter(w => w.enabled).length || 0,
      total_widgets_count: config.widgets?.length || 0
    } : getDefaultKioskConfig(buildingId || 0),
    settings,
    
    // Slides
    slides,
    currentSlide,
    
    // Actions
    nextSlide,
    prevSlide,
    goToSlide,
    toggleAutoSlide,
    
    // Settings
    updateSettings,
    toggleWidget,
    updateWidgetSettings,
  };
}
