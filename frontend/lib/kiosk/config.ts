// Kiosk Configuration Constants
import { KioskWidget, KioskSettings, WidgetId } from '@/types/kiosk';

// Default settings
export const DEFAULT_KIOSK_SETTINGS: KioskSettings = {
  slideDuration: 10, // seconds
  refreshInterval: 30, // seconds
  autoRefresh: true,
  showSidebar: true,
  showTopBar: true,
  theme: 'default'
};

// Default widgets configuration
export const DEFAULT_WIDGETS: KioskWidget[] = [
  // Main Slides
  {
    id: 'dashboard_overview' as WidgetId,
    name: 'Dashboard Overview',
    description: 'Συνολική επισκόπηση του κτιρίου',
    category: 'main_slides',
    component: 'DashboardWidget',
    enabled: true,
    order: 0,
    settings: {}
  },
  {
    id: 'building_statistics' as WidgetId,
    name: 'Building Statistics',
    description: 'Στατιστικά κτιρίου',
    category: 'main_slides',
    enabled: true,
    order: 1,
    settings: {}
  },
  {
    id: 'emergency_contacts' as WidgetId,
    name: 'Emergency Contacts',
    description: 'Τηλέφωνα έκτακτης ανάγκης',
    category: 'main_slides',
    enabled: true,
    order: 2,
    settings: {}
  },
  {
    id: 'announcements' as WidgetId,
    name: 'Announcements',
    description: 'Ανακοινώσεις',
    category: 'main_slides',
    enabled: true,
    order: 3,
    settings: {}
  },
  {
    id: 'votes' as WidgetId,
    name: 'Votes',
    description: 'Ψηφοφορίες',
    category: 'main_slides',
    enabled: true,
    order: 4,
    settings: {}
  },
  {
    id: 'financial_overview' as WidgetId,
    name: 'Financial Overview',
    description: 'Οικονομική επισκόπηση',
    category: 'main_slides',
    enabled: true,
    order: 5,
    settings: {}
  },
  {
    id: 'maintenance_overview' as WidgetId,
    name: 'Maintenance Overview',
    description: 'Συντήρηση και επισκευές',
    category: 'main_slides',
    enabled: true,
    order: 6,
    settings: {}
  },
  {
    id: 'projects_overview' as WidgetId,
    name: 'Projects Overview',
    description: 'Έργα και προσφορές',
    category: 'main_slides',
    enabled: true,
    order: 7,
    settings: {}
  },
  
  // Sidebar Widgets
  {
    id: 'current_time' as WidgetId,
    name: 'Current Time',
    description: 'Τρέχουσα ώρα και ημερομηνία',
    category: 'sidebar_widgets',
    enabled: true,
    order: 0,
    settings: {}
  },
  {
    id: 'qr_code_connection' as WidgetId,
    name: 'QR Code Connection',
    description: 'Σύνδεση με κινητό',
    category: 'sidebar_widgets',
    enabled: true,
    order: 1,
    settings: {}
  },
  {
    id: 'weather_widget_sidebar' as WidgetId,
    name: 'Weather Widget',
    description: 'Πρόγνωση καιρού',
    category: 'sidebar_widgets',
    enabled: true,
    order: 2,
    settings: {}
  },
  {
    id: 'internal_manager_info' as WidgetId,
    name: 'Internal Manager Info',
    description: 'Πληροφορίες διαχειριστή',
    category: 'sidebar_widgets',
    enabled: true,
    order: 3,
    settings: {}
  },
  {
    id: 'community_message' as WidgetId,
    name: 'Community Message',
    description: 'Μήνυμα κοινότητας',
    category: 'sidebar_widgets',
    enabled: true,
    order: 4,
    settings: {}
  },
  {
    id: 'advertising_banners_sidebar' as WidgetId,
    name: 'Advertising Banners',
    description: 'Χρήσιμες υπηρεσίες',
    category: 'sidebar_widgets',
    enabled: true,
    order: 5,
    settings: {}
  },
  
  // Top Bar Widgets
  {
    id: 'weather_widget_topbar' as WidgetId,
    name: 'Weather Top Bar',
    description: 'Καιρός στην επάνω μπάρα',
    category: 'top_bar_widgets',
    enabled: true,
    order: 0,
    settings: {}
  },
  {
    id: 'advertising_banners_topbar' as WidgetId,
    name: 'Advertising Top Bar',
    description: 'Διαφημίσεις στην επάνω μπάρα',
    category: 'top_bar_widgets',
    enabled: true,
    order: 1,
    settings: {}
  },
  
  // Special Widgets
  {
    id: 'news_ticker' as WidgetId,
    name: 'News Ticker',
    description: 'Τελευταία νέα',
    category: 'special_widgets',
    enabled: true,
    order: 0,
    settings: {}
  }
];

// Layout configurations
export const LAYOUT_CONFIGS = {
  '2x2': {
    gridTemplate: 'repeat(2, 1fr) / repeat(2, 1fr)',
    maxWidgets: 4
  },
  '1x3': {
    gridTemplate: '1fr / repeat(3, 1fr)',
    maxWidgets: 3
  },
  '3x1': {
    gridTemplate: 'repeat(3, 1fr) / 1fr',
    maxWidgets: 3
  },
  '1x1': {
    gridTemplate: '1fr / 1fr',
    maxWidgets: 1
  },
  '2x1+1x1': {
    gridTemplate: 'repeat(2, 1fr) / repeat(2, 1fr)',
    maxWidgets: 3
  }
} as const;

// Widget icons mapping
export const WIDGET_ICONS = {
  dashboard_overview: 'Home',
  building_statistics: 'Building',
  emergency_contacts: 'Shield',
  announcements: 'Bell',
  votes: 'Vote',
  financial_overview: 'Euro',
  maintenance_overview: 'Wrench',
  projects_overview: 'FileText',
  current_time: 'Clock',
  qr_code_connection: 'QrCode',
  weather_widget_sidebar: 'Thermometer',
  weather_widget_topbar: 'Globe',
  internal_manager_info: 'Users',
  community_message: 'MessageSquare',
  advertising_banners_sidebar: 'Megaphone',
  advertising_banners_topbar: 'ExternalLink',
  news_ticker: 'TrendingUp'
} as const;

// Category colors for UI
export const CATEGORY_COLORS = {
  main_slides: 'bg-blue-100 text-blue-800 border-blue-200',
  sidebar_widgets: 'bg-green-100 text-green-800 border-green-200',
  top_bar_widgets: 'bg-purple-100 text-purple-800 border-purple-200',
  special_widgets: 'bg-orange-100 text-orange-800 border-orange-200'
} as const;

// Category labels
export const CATEGORY_LABELS = {
  main_slides: 'Κύρια Slides',
  sidebar_widgets: 'Sidebar Widgets',
  top_bar_widgets: 'Top Bar Widgets',
  special_widgets: 'Ειδικά Widgets'
} as const;
