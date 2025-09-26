export type WidgetCategory = 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets';

export interface GridPosition {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export interface KioskWidget {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  enabled: boolean;
  order: number;
  settings: Record<string, any>;
  gridPosition?: GridPosition;
}

export interface KioskSettings {
  slideDuration: number;
  refreshInterval: number;
  autoRefresh: boolean;
}

export interface CanvasGridCell {
  row: number;
  col: number;
  occupied: boolean;
  widgetId?: string;
}

export interface DragItem {
  id: string;
  type: 'widget';
  data: KioskWidget;
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
      widgetPositions: Record<string, GridPosition>;
    };
  };
  widgets: KioskWidget[];
  settings: KioskSettings;
  enabled_widgets_count: number;
  total_widgets_count: number;
  created_at?: string;
  updated_at?: string;
}

// Widget category labels
export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  main_slides: 'Κύρια Slides',
  sidebar_widgets: 'Sidebar Widgets',
  top_bar_widgets: 'Top Bar Widgets',
  special_widgets: 'Ειδικά Widgets',
};

// Widget category colors
export const CATEGORY_COLORS: Record<WidgetCategory, string> = {
  main_slides: 'bg-blue-100 text-blue-800 border-blue-200',
  sidebar_widgets: 'bg-green-100 text-green-800 border-green-200',
  top_bar_widgets: 'bg-purple-100 text-purple-800 border-purple-200',
  special_widgets: 'bg-orange-100 text-orange-800 border-orange-200',
};

// Default grid configuration
export const DEFAULT_GRID_SIZE = {
  rows: 8,
  cols: 12,
};

export const CELL_SIZE = 60; // pixels