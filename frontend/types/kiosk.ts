// Base widget props interface
export interface BaseWidgetProps {
  widget?: any; // Optional for backwards compatibility
  data?: any;
  isLoading?: boolean;
  error?: string;
  settings?: Record<string, any>; // Can override widget.settings
}

