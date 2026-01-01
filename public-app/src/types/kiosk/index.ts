// frontend/types/kiosk/index.ts

export interface KioskWidget {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'custom';
  category: 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets';
  enabled: boolean;
  order: number;
  settings: WidgetSettings;

  // Dynamic properties
  component: string;               // Component name for dynamic rendering
  dataSource?: string;            // API endpoint or data source
  refreshInterval?: number;       // Auto-refresh interval in seconds
  customCode?: string;            // Custom widget code (for custom widgets)

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;              // User ID
}

export interface WidgetSettings {
  // Display settings
  title?: string;
  showTitle?: boolean;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;

  // Layout settings
  gridSize?: 'small' | 'medium' | 'large' | 'full';
  aspectRatio?: string;

  // Data settings
  dataFilters?: Record<string, any>;
  displayLimit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Animation settings
  animationType?: 'none' | 'fade' | 'slide' | 'bounce';
  animationDuration?: number;

  // Custom settings (for custom widgets)
  customSettings?: Record<string, any>;
}

export interface KioskConfiguration {
  id: number;
  building: number;
  name: string;
  description?: string;

  // Layout settings
  layout: {
    type: 'grid' | 'slides';
    columns: number;
    rows: number;
    gap: number;
    autoResize: boolean;
  };

  // Display settings
  display: {
    slideDuration: number;
    autoSlide: boolean;
    showNavigation: boolean;
    showSidebar: boolean;
    showTopBar: boolean;
    theme: 'light' | 'dark' | 'auto';
    fullscreen: boolean;
  };

  // Widget configuration
  widgets: KioskWidget[];

  // Refresh settings
  refresh: {
    enabled: boolean;
    interval: number;
    timeRange?: {
      start: string; // HH:mm
      end: string;   // HH:mm
    };
  };

  // Access control
  access: {
    public: boolean;
    roles: string[];
    buildings: number[];
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
  isActive: boolean;
}

export interface KioskSlide {
  id: string;
  name: string;
  widgets: KioskWidget[];
  layout: 'grid' | 'single' | 'split';
  order: number;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: KioskWidget['category'];
  defaultSettings: WidgetSettings;
  previewImage?: string;
  tags: string[];
}

export interface KioskStats {
  activeKiosks: number;
  totalWidgets: number;
  totalBuildings: number;
  lastUpdated: Date;
}

export interface KioskPermissions {
  canView: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canManageLayouts: boolean;
  canAccessAnalytics: boolean;
  canManageUsers: boolean;
}

export type UserRole = 'superuser' | 'manager' | 'staff' | 'resident';

export const ROLE_PERMISSIONS: Record<UserRole, KioskPermissions> = {
  superuser: {
    canView: true,
    canEdit: true,
    canCreate: true,
    canDelete: true,
    canManageLayouts: true,
    canAccessAnalytics: true,
    canManageUsers: true,
  },
  manager: {
    canView: true,
    canEdit: true,
    canCreate: true,
    canDelete: true,
    canManageLayouts: true,
    canAccessAnalytics: true,
    canManageUsers: false,
  },
  staff: {
    canView: true,
    canEdit: true,
    canCreate: false,
    canDelete: false,
    canManageLayouts: false,
    canAccessAnalytics: false,
    canManageUsers: false,
  },
  resident: {
    canView: true,
    canEdit: false,
    canCreate: false,
    canDelete: false,
    canManageLayouts: false,
    canAccessAnalytics: false,
    canManageUsers: false,
  },
};

export interface WidgetError {
  id: string;
  widgetId: string;
  error: string;
  timestamp: Date;
  resolved: boolean;
}

export interface KioskAnalytics {
  viewCounts: Record<string, number>;
  widgetPerformance: Record<string, {
    loadTime: number;
    errorRate: number;
    lastUpdated: Date;
  }>;
  userInteractions: {
    slideChanges: number;
    settingsAccess: number;
    timestamp: Date;
  }[];
}
