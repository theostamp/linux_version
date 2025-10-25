// Kiosk Utility Functions
import { KioskWidget, KioskSlide, WidgetCategory } from '@/types/kiosk';
import { DEFAULT_WIDGETS } from './config';

// Filter widgets by category
export function getWidgetsByCategory(widgets: KioskWidget[], category: WidgetCategory): KioskWidget[] {
  return widgets.filter(widget => widget.category === category && widget.enabled);
}

// Sort widgets by order
export function sortWidgetsByOrder(widgets: KioskWidget[]): KioskWidget[] {
  return [...widgets].sort((a, b) => a.order - b.order);
}

// Create slides from widgets
export function createSlidesFromWidgets(widgets: KioskWidget[]): KioskSlide[] {
  const mainSlidesWidgets = getWidgetsByCategory(widgets, 'main_slides');
  const sortedWidgets = sortWidgetsByOrder(mainSlidesWidgets);
  
  const slides: KioskSlide[] = [];
  let slideIndex = 0;
  
  // Create 2x2 slides (4 widgets per slide)
  for (let i = 0; i < sortedWidgets.length; i += 4) {
    const slideWidgets = sortedWidgets.slice(i, i + 4);
    slides.push({
      id: `slide-${slideIndex}`,
      name: `Slide ${slideIndex + 1}`,
      layout: '2x2',
      widgets: slideWidgets,
      duration: 10,
      order: slideIndex
    });
    slideIndex++;
  }
  
  return slides;
}

// Get default config
export function getDefaultKioskConfig(buildingId: number) {
  return {
    building: buildingId,
    widgets: DEFAULT_WIDGETS,
    settings: {
      slideDuration: 10,
      refreshInterval: 30,
      autoRefresh: true,
      showSidebar: true,
      showTopBar: true,
      theme: 'default' as const
    },
    enabled_widgets_count: DEFAULT_WIDGETS.filter(w => w.enabled).length,
    total_widgets_count: DEFAULT_WIDGETS.length
  };
}

// Validate widget configuration
export function validateWidgetConfig(widget: KioskWidget): boolean {
  return !!(
    widget.id &&
    widget.name &&
    widget.description &&
    widget.category &&
    typeof widget.enabled === 'boolean' &&
    typeof widget.order === 'number'
  );
}

// Get widget by ID
export function getWidgetById(widgets: KioskWidget[], id: string): KioskWidget | undefined {
  return widgets.find(widget => widget.id === id);
}

// Toggle widget enabled state
export function toggleWidget(widgets: KioskWidget[], widgetId: string): KioskWidget[] {
  return widgets.map(widget => 
    widget.id === widgetId 
      ? { ...widget, enabled: !widget.enabled }
      : widget
  );
}

// Update widget settings
export function updateWidgetSettings(widgets: KioskWidget[], widgetId: string, settings: Record<string, any>): KioskWidget[] {
  return widgets.map(widget => 
    widget.id === widgetId 
      ? { ...widget, settings: { ...widget.settings, ...settings } }
      : widget
  );
}

// Update widget order
export function updateWidgetOrder(widgets: KioskWidget[], widgetId: string, newOrder: number): KioskWidget[] {
  return widgets.map(widget => 
    widget.id === widgetId 
      ? { ...widget, order: newOrder }
      : widget
  );
}

// Generate unique widget ID
export function generateWidgetId(baseName: string): string {
  return `${baseName}_${Date.now()}`;
}

// Format widget name for display
export function formatWidgetName(widgetId: string): string {
  return widgetId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Check if widget is main slide
export function isMainSlideWidget(widget: KioskWidget): boolean {
  return widget.category === 'main_slides';
}

// Check if widget is sidebar widget
export function isSidebarWidget(widget: KioskWidget): boolean {
  return widget.category === 'sidebar_widgets';
}

// Check if widget is top bar widget
export function isTopBarWidget(widget: KioskWidget): boolean {
  return widget.category === 'top_bar_widgets';
}

// Check if widget is special widget
export function isSpecialWidget(widget: KioskWidget): boolean {
  return widget.category === 'special_widgets';
}
