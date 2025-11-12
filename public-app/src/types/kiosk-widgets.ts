export interface WidgetConfig {
  widgets: KioskWidget[];
  layout: {
    gridSize: string;
    backgroundColor: string;
    showTitle: boolean;
  };
}

export interface KioskWidget {
  id: string;
  name: string;
  description: string;
  type: 'custom' | 'builtin';
  category: string;
  component: string;
  enabled: boolean;
  order: number;
  settings: Record<string, any>;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  widgets: [],
  layout: {
    gridSize: 'medium',
    backgroundColor: '#ffffff',
    showTitle: true
  }
};
