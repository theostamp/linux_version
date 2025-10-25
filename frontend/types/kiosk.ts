// New Kiosk Application Types
// Simplified types without drag & drop complexity

export interface KioskWidget {
  id: string; // Widget ID (e.g., "dashboard_overview")
  dbId?: number; // Database ID for edit operations
  name: string;
  greekName?: string;
  description: string;
  greekDescription?: string;
  category: 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets';
  component?: string;
  icon?: string;
  enabled: boolean;
  order: number;
  settings: Record<string, any>;
  type?: 'system' | 'custom';
  dataSource?: string;
  refreshInterval?: number;
  createdAt?: Date;
  updatedAt?: Date;
  lastModified?: Date;
  buildingId?: number;
  createdBy?: number;
  // NO gridPosition - removed complexity
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  component?: string;
  defaultSettings: Record<string, any>;
  icon?: string;
  tags?: string[];
}

export interface KioskSettings {
  slideDuration: number;
  refreshInterval: number;
  autoRefresh: boolean;
  showSidebar: boolean;
  showTopBar: boolean;
  theme: 'default' | 'dark' | 'light';
}

export interface KioskConfig {
  id?: number;
  building: number;
  widgets: KioskWidget[];
  settings: KioskSettings;
  enabled_widgets_count: number;
  total_widgets_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface KioskSlide {
  id: string;
  name: string;
  layout: '2x2' | '1x3' | '3x1' | '1x1' | '2x1+1x1';
  widgets: KioskWidget[];
  duration: number;
  order: number;
}

export interface KioskLayout {
  type: '2x2' | '1x3' | '3x1' | '1x1' | '2x1+1x1';
  gridTemplate: string;
  widgetPositions: Array<{
    widget: KioskWidget;
    position: { row: number; col: number; span: number };
  }>;
}

// Widget categories
export type WidgetCategory = 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets';

// Widget IDs for type safety
export type WidgetId = 
  | 'dashboard_overview'
  | 'building_statistics'
  | 'emergency_contacts'
  | 'announcements'
  | 'votes'
  | 'financial_overview'
  | 'maintenance_overview'
  | 'projects_overview'
  | 'current_time'
  | 'qr_code_connection'
  | 'weather_widget_sidebar'
  | 'weather_widget_topbar'
  | 'internal_manager_info'
  | 'community_message'
  | 'advertising_banners_sidebar'
  | 'advertising_banners_topbar'
  | 'news_ticker';

// Base widget props interface
export interface BaseWidgetProps {
  widget?: KioskWidget; // Optional for backwards compatibility
  data?: any;
  isLoading?: boolean;
  error?: string;
  settings?: Record<string, any>; // Can override widget.settings
}
