// Kiosk API service for configuration management

import { api, apiPublic } from '@/lib/api'; // Using public API for kiosk
import { KioskConfig, KioskWidget } from '@/types/kiosk';

export interface KioskConfigResponse {
  id: number;
  building: number;
  widgets: KioskWidget[];
  settings: {
    slideDuration: number;
    refreshInterval: number;
    autoRefresh: boolean;
    showSidebar: boolean;
    showTopBar: boolean;
    theme: 'default' | 'dark' | 'light';
  };
  created_at: string;
  updated_at: string;
}

export interface UpdateKioskConfigRequest {
  widgets?: KioskWidget[];
  settings?: Partial<KioskConfigResponse['settings']>;
}

// Fetch kiosk configuration for a building
export async function fetchKioskConfig(buildingId: number): Promise<KioskConfigResponse | null> {
  try {
    const response = await apiPublic.get(`/kiosk/public/configs/?building_id=${buildingId}`);
    
    // Transform the backend response to match the expected interface
    return {
      id: buildingId,
      building: buildingId,
      widgets: response.data.widgets || [],
      settings: {
        slideDuration: 10,
        refreshInterval: 30,
        autoRefresh: true,
        showSidebar: true,
        showTopBar: true,
        theme: 'default'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      // No configuration exists for this building
      return null;
    }
    throw error;
  }
}

// Create or update kiosk configuration
export async function saveKioskConfig(
  buildingId: number, 
  config: UpdateKioskConfigRequest
): Promise<KioskConfigResponse> {
  try {
    // Use the sync endpoint to bulk update widgets
    const response = await api.post('/kiosk/configs/sync/', {
      buildingId: buildingId,
      widgets: config.widgets || []
    });
    
    // Return a mock response that matches the expected interface
    return {
      id: buildingId,
      building: buildingId,
      widgets: response.data.widgets || [],
      settings: config.settings || {
        slideDuration: 10,
        refreshInterval: 30,
        autoRefresh: true,
        showSidebar: true,
        showTopBar: true,
        theme: 'default'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error saving kiosk configuration:', error);
    throw error;
  }
}

// Update widget settings
export async function updateWidgetSettings(
  buildingId: number,
  widgetId: string,
  settings: Record<string, any>
): Promise<KioskConfigResponse> {
  const currentConfig = await fetchKioskConfig(buildingId);
  if (!currentConfig) {
    throw new Error('Kiosk configuration not found');
  }

  const updatedWidgets = currentConfig.widgets.map(widget =>
    widget.id === widgetId 
      ? { ...widget, settings: { ...widget.settings, ...settings } }
      : widget
  );

  return saveKioskConfig(buildingId, { widgets: updatedWidgets });
}

// Toggle widget enabled state
export async function toggleWidget(
  buildingId: number,
  widgetId: string,
  enabled: boolean
): Promise<KioskConfigResponse> {
  const currentConfig = await fetchKioskConfig(buildingId);
  if (!currentConfig) {
    throw new Error('Kiosk configuration not found');
  }

  const updatedWidgets = currentConfig.widgets.map(widget =>
    widget.id === widgetId 
      ? { ...widget, enabled }
      : widget
  );

  return saveKioskConfig(buildingId, { widgets: updatedWidgets });
}

// Update widget order
export async function updateWidgetOrder(
  buildingId: number,
  widgetOrder: { id: string; order: number }[]
): Promise<KioskConfigResponse> {
  const currentConfig = await fetchKioskConfig(buildingId);
  if (!currentConfig) {
    throw new Error('Kiosk configuration not found');
  }

  const updatedWidgets = currentConfig.widgets.map(widget => {
    const orderUpdate = widgetOrder.find(order => order.id === widget.id);
    return orderUpdate ? { ...widget, order: orderUpdate.order } : widget;
  });

  return saveKioskConfig(buildingId, { widgets: updatedWidgets });
}

// Reset kiosk configuration to defaults
export async function resetKioskConfig(buildingId: number): Promise<KioskConfigResponse> {
  const defaultConfig: UpdateKioskConfigRequest = {
    widgets: [], // Will be populated with defaults
    settings: {
      slideDuration: 10,
      refreshInterval: 60,
      autoRefresh: true,
      showSidebar: true,
      showTopBar: true,
      theme: 'default'
    }
  };

  return saveKioskConfig(buildingId, defaultConfig);
}
