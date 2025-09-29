// frontend/lib/kiosk/widgets/registry.ts

import { KioskWidget } from '@/types/kiosk';
import {
  Home,
  Bell,
  Vote,
  DollarSign,
  Wrench,
  FolderOpen,
  Users,
  Car,
  Package,
  Phone,
  Mail,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  Clock,
  QrCode,
  Cloud,
  AlertTriangle,
  LucideIcon
} from 'lucide-react';

// Widget component registry for dynamic loading
import DashboardWidget from '@/components/kiosk/widgets/DashboardWidget';
import AnnouncementsWidget from '@/components/kiosk/widgets/AnnouncementsWidget';
import TimeWidget from '@/components/kiosk/widgets/TimeWidget';
import VotesWidget from '@/components/kiosk/widgets/VotesWidget';
import FinancialWidget from '@/components/kiosk/widgets/FinancialWidget';
import MaintenanceWidget from '@/components/kiosk/widgets/MaintenanceWidget';
import WeatherWidget from '@/components/kiosk/widgets/WeatherWidget';
import QRCodeWidget from '@/components/kiosk/widgets/QRCodeWidget';
import ManagerWidget from '@/components/kiosk/widgets/ManagerWidget';
import UrgentPrioritiesWidget from '@/components/kiosk/widgets/UrgentPrioritiesWidget';

export const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  DashboardWidget,
  AnnouncementsWidget,
  TimeWidget,
  VotesWidget,
  FinancialWidget,
  MaintenanceWidget,
  WeatherWidget,
  QRCodeWidget,
  ManagerWidget,
  UrgentPrioritiesWidget,
  // Alias for top bar widgets
  WeatherTopBarWidget: WeatherWidget,
  // Alias for special widgets
  NewsTickerWidget: AnnouncementsWidget,
};

// Widget icon mapping
export const WIDGET_ICONS: Record<string, LucideIcon> = {
  // Main widgets
  DashboardWidget: Home,
  AnnouncementsWidget: Bell,
  TimeWidget: Clock,
  VotesWidget: Vote,
  FinancialWidget: DollarSign,
  MaintenanceWidget: Wrench,
  WeatherWidget: Cloud,
  QRCodeWidget: QrCode,
  ManagerWidget: Phone,
  UrgentPrioritiesWidget: AlertTriangle,
  
  // Alias widgets
  WeatherTopBarWidget: Cloud,
  NewsTickerWidget: Bell,
  
  // Specialized widgets
  OccupancyWidget: Users,
  ParkingWidget: Car,
  StorageWidget: Package,
  ProjectsWidget: FolderOpen,
  ContactsWidget: Phone,
  MessagesWidget: Mail,
  CalendarWidget: Calendar,
  DocumentsWidget: FileText,
  StatisticsWidget: BarChart3,
  SettingsWidget: Settings,
};

// Function to get widget icon based on component name or widget name
export const getWidgetIcon = (widget: KioskWidget | string): LucideIcon => {
  // If it's a string, treat it as component name
  if (typeof widget === 'string') {
    return WIDGET_ICONS[widget] || Home;
  }
  
  // For widget objects, try component first, then name
  const componentIcon = WIDGET_ICONS[widget.component];
  if (componentIcon) {
    return componentIcon;
  }
  
  // Fallback: try to match by name patterns
  const name = widget.name.toLowerCase();
  
  // Dashboard and Overview
  if (name.includes('dashboard') || name.includes('overview') || name.includes('επισκόπηση')) return Home;
  
  // Announcements
  if (name.includes('announcement') || name.includes('ανακοίνωση') || name.includes('ειδοποίηση')) return Bell;
  
  // Votes and Polls
  if (name.includes('vote') || name.includes('poll') || name.includes('ψηφοφορία') || name.includes('δημοσκόπηση')) return Vote;
  
  // Financial and Expenses
  if (name.includes('financial') || name.includes('expense') || name.includes('οικονομικά') || name.includes('κοινόχρηστα') || name.includes('έξοδα')) return DollarSign;
  
  // Maintenance
  if (name.includes('maintenance') || name.includes('συντήρηση') || name.includes('επισκευή') || name.includes('τεχνική')) return Wrench;
  
  // Projects
  if (name.includes('project') || name.includes('έργο') || name.includes('πρόγραμμα')) return FolderOpen;
  
  // Occupancy and Residents
  if (name.includes('occupancy') || name.includes('resident') || name.includes('κατοικία') || name.includes('κάτοικος') || name.includes('διαμερίσματα')) return Users;
  
  // Parking
  if (name.includes('parking') || name.includes('πάρκινγκ') || name.includes('θέσεις')) return Car;
  
  // Storage
  if (name.includes('storage') || name.includes('αποθήκη') || name.includes('αποθηκευτικός')) return Package;
  
  // Contacts and Manager
  if (name.includes('contact') || name.includes('manager') || name.includes('διαχειριστής') || name.includes('επικοινωνία')) return Phone;
  
  // Messages and Communication
  if (name.includes('message') || name.includes('communication') || name.includes('μήνυμα') || name.includes('επικοινωνία')) return Mail;
  
  // Calendar and Events
  if (name.includes('calendar') || name.includes('event') || name.includes('ημερολόγιο') || name.includes('εκδήλωση')) return Calendar;
  
  // Documents and Reports
  if (name.includes('document') || name.includes('report') || name.includes('έγγραφο') || name.includes('αναφορά')) return FileText;
  
  // Statistics and Analytics
  if (name.includes('statistics') || name.includes('analytics') || name.includes('στατιστικά') || name.includes('ανάλυση')) return BarChart3;
  
  // Settings and Configuration
  if (name.includes('settings') || name.includes('config') || name.includes('ρυθμίσεις') || name.includes('διαμόρφωση')) return Settings;
  
  // Time and Clock
  if (name.includes('time') || name.includes('ώρα') || name.includes('χρόνος')) return Clock;
  
  // Weather
  if (name.includes('weather') || name.includes('καιρός') || name.includes('άνεμος')) return Cloud;
  
  // QR Code
  if (name.includes('qr') || name.includes('code') || name.includes('σύνδεση')) return QrCode;
  
  // Default fallback
  return Home;
};

// Register a widget component
export function registerWidget(componentName: string, component: React.ComponentType<any>) {
  WIDGET_COMPONENTS[componentName] = component;
}

// Get a widget component by name
export function getWidgetComponent(componentName: string): React.ComponentType<any> | null {
  return WIDGET_COMPONENTS[componentName] || null;
}

// Check if widget has data or should be shown
export function hasWidgetData(widget: KioskWidget, data?: any): boolean {
  // Always show basic widgets that don't rely on external data
  const alwaysShowWidgets = [
    'TimeWidget',
    'QRCodeWidget',
    'ManagerWidget',
    'WeatherWidget', // Weather usually has data
    'WeatherTopBarWidget',
  ];

  if (alwaysShowWidgets.includes(widget.component)) {
    return true;
  }

  // Check data-dependent widgets
  switch (widget.component) {
    case 'AnnouncementsWidget':
      return data?.announcements && data.announcements.length > 0;

    case 'VotesWidget':
      return data?.votes && data.votes.length > 0;

    case 'FinancialWidget':
      return data?.financial && (
        data.financial.collection_rate !== undefined ||
        data.financial.reserve_fund !== undefined ||
        data.financial.recent_transactions?.length > 0
      );

    case 'DashboardWidget':
      return (
        (data?.announcements && data.announcements.length > 0) ||
        (data?.votes && data.votes.length > 0) ||
        data?.financial_info ||
        data?.maintenance_info
      );

    case 'MaintenanceWidget':
      return data?.maintenance && (
        data.maintenance.active_tasks?.length > 0 ||
        data.maintenance.scheduled?.length > 0
      );

    case 'ProjectsWidget':
      return data?.projects && data.projects.length > 0;

    case 'EmergencyWidget':
      // Emergency contacts should always show
      return true;

    case 'StatisticsWidget':
      return data?.statistics && Object.keys(data.statistics).length > 0;

    case 'CommunityWidget':
      return data?.community_messages && data.community_messages.length > 0;

    case 'AdvertisingWidget':
    case 'AdvertisingTopBarWidget':
      return data?.advertisements && data.advertisements.length > 0;

    case 'NewsTickerWidget':
      return data?.news && data.news.length > 0;

    default:
      // For custom widgets, show if enabled
      return widget.enabled;
  }
}

// System widget definitions
export const SYSTEM_WIDGETS: Omit<KioskWidget, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  // Main Slides
  {
    name: 'Dashboard Overview',
    description: 'Building overview with key statistics',
    category: 'main_slides',
    component: 'DashboardWidget',
    enabled: true,
    order: 1,
    settings: {
      title: 'Επισκόπηση Κτιρίου',
      showTitle: true,
      gridSize: 'large',
      backgroundColor: '#0F172A',
      dataSource: '/api/public-info',
      refreshInterval: 300,
    },
  },
  {
    name: 'Announcements',
    description: 'Latest building announcements',
    category: 'main_slides',
    component: 'AnnouncementsWidget',
    enabled: true,
    order: 2,
    settings: {
      title: 'Ανακοινώσεις',
      showTitle: true,
      gridSize: 'large',
      displayLimit: 3, // Reduced from 5 to 3 for better height control
      maxItems: 3,
      backgroundColor: '#1E293B',
      dataSource: '/api/announcements',
      refreshInterval: 180,
    },
  },
  {
    name: 'Active Votes',
    description: 'Current voting sessions',
    category: 'main_slides',
    component: 'VotesWidget',
    enabled: true,
    order: 3,
    settings: {
      title: 'Ψηφοφορίες',
      showTitle: true,
      gridSize: 'medium',
      displayLimit: 2, // Limit to 2 votes for better height control
      maxItems: 2,
      backgroundColor: '#0F766E',
      dataSource: '/api/votes',
      refreshInterval: 300,
    },
  },
  {
    name: 'Financial Overview',
    description: 'Financial information and common expenses',
    category: 'main_slides',
    component: 'FinancialWidget',
    enabled: true,
    order: 4,
    settings: {
      title: 'Οικονομικά Στοιχεία',
      showTitle: true,
      gridSize: 'large',
      backgroundColor: '#059669',
      dataSource: '/api/financial',
      refreshInterval: 600,
    },
  },
  {
    name: 'Maintenance & Services',
    description: 'Maintenance schedules and service information',
    category: 'main_slides',
    component: 'MaintenanceWidget',
    enabled: true,
    order: 5,
    settings: {
      title: 'Συντήρηση & Υπηρεσίες',
      showTitle: true,
      gridSize: 'medium',
      backgroundColor: '#D97706',
      displayLimit: 3, // Limit to 3 items to prevent height expansion
      maxItems: 3,
      dataSource: '/api/maintenance',
      refreshInterval: 300,
    },
  },
  {
    name: 'Projects & Construction',
    description: 'Ongoing projects and construction updates',
    category: 'main_slides',
    component: 'ProjectsWidget',
    enabled: false,
    order: 6,
    settings: {
      title: 'Έργα & Κατασκευές',
      showTitle: true,
      gridSize: 'medium',
      backgroundColor: '#0284C5',
    },
    dataSource: '/api/projects',
    refreshInterval: 600,
  },
  {
    name: 'Emergency Contacts',
    description: 'Emergency contacts and safety information',
    category: 'main_slides',
    component: 'EmergencyWidget',
    enabled: true,
    order: 7,
    settings: {
      title: 'Επείγοντα Τηλέφωνα',
      showTitle: true,
      gridSize: 'medium',
      backgroundColor: '#DC2626',
    },
    refreshInterval: 86400, // Daily refresh
  },
  {
    name: 'Building Statistics',
    description: 'Building statistics and metrics',
    category: 'main_slides',
    component: 'StatisticsWidget',
    enabled: false,
    order: 8,
    settings: {
      title: 'Στατιστικά Κτιρίου',
      showTitle: true,
      gridSize: 'medium',
      backgroundColor: '#059669',
    },
    dataSource: '/api/statistics',
    refreshInterval: 600,
  },

  // Sidebar Widgets
  {
    name: 'Current Time',
    description: 'Current date and time display',
    category: 'sidebar_widgets',
    component: 'TimeWidget',
    enabled: false,
    order: 1,
    settings: {
      showTitle: false,
      gridSize: 'small',
      backgroundColor: '#1e293b',
      textColor: '#ffffff',
    },
    refreshInterval: 1,
  },
  {
    name: 'QR Code',
    description: 'QR code for building information',
    category: 'sidebar_widgets',
    component: 'QRCodeWidget',
    enabled: false,
    order: 2,
    settings: {
      title: 'Σάρωση για Πληροφορίες',
      showTitle: true,
      gridSize: 'small',
      backgroundColor: '#0F172A',
    },
  },
  {
    name: 'Weather Display',
    description: 'Current weather conditions',
    category: 'sidebar_widgets',
    component: 'WeatherWidget',
    enabled: false,
    order: 3,
    settings: {
      showTitle: false,
      gridSize: 'small',
      backgroundColor: '#0ea5e9',
      textColor: '#ffffff',
    },
    dataSource: 'weather-api',
    refreshInterval: 600,
  },
  {
    name: 'Manager Information',
    description: 'Building manager contact information',
    category: 'sidebar_widgets',
    component: 'ManagerWidget',
    enabled: true,
    order: 4,
    settings: {
      title: 'Διαχειριστής',
      showTitle: true,
      gridSize: 'small',
      backgroundColor: '#1E293B',
    },
    dataSource: '/api/manager-info',
    refreshInterval: 86400,
  },
  {
    name: 'Urgent Priorities',
    description: 'Immediate priorities and urgent tasks',
    category: 'special_widgets',
    component: 'UrgentPrioritiesWidget',
    enabled: true,
    order: 1,
    settings: {
      title: 'Άμεσες Προτεραιότητες',
      showTitle: true,
      gridSize: 'large',
      backgroundColor: '#DC2626',
      maxItems: 5,
      showDueDates: true,
      showContact: true,
    },
    dataSource: '/api/urgent-priorities',
    refreshInterval: 300,
  },
  {
    name: 'Community Message',
    description: 'Community message or notice',
    category: 'sidebar_widgets',
    component: 'CommunityWidget',
    enabled: false,
    order: 5,
    settings: {
      title: 'Μήνυμα Κοινότητας',
      showTitle: true,
      gridSize: 'small',
      backgroundColor: '#0D9488',
    },
  },
  {
    name: 'Advertising Banner',
    description: 'Advertising or promotional content',
    category: 'sidebar_widgets',
    component: 'AdvertisingWidget',
    enabled: false,
    order: 6,
    settings: {
      showTitle: false,
      gridSize: 'small',
      backgroundColor: '#1E293B',
    },
  },

  // Top Bar Widgets
  {
    name: 'Weather Top Bar',
    description: 'Compact weather display for top bar',
    category: 'top_bar_widgets',
    component: 'WeatherTopBarWidget',
    enabled: true,
    order: 1,
    settings: {
      showTitle: false,
      backgroundColor: 'transparent',
      textColor: '#ffffff',
    },
    dataSource: 'weather-api',
    refreshInterval: 600,
  },
  {
    name: 'Advertising Top Bar',
    description: 'Rotating advertisements in top bar',
    category: 'top_bar_widgets',
    component: 'AdvertisingTopBarWidget',
    enabled: false,
    order: 2,
    settings: {
      showTitle: false,
      backgroundColor: 'transparent',
      animationType: 'slide',
      animationDuration: 3000,
    },
  },

  // Special Widgets
  {
    name: 'News Ticker',
    description: 'Scrolling news ticker',
    category: 'special_widgets',
    component: 'NewsTickerWidget',
    enabled: false,
    order: 1,
    settings: {
      showTitle: false,
      backgroundColor: '#1e293b',
      textColor: '#ffffff',
      animationType: 'slide',
      animationDuration: 10000,
    },
    dataSource: '/api/news',
    refreshInterval: 300,
  },
];

// Widget templates for easy creation
export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'data-display',
    name: 'Data Display Widget',
    description: 'Display data from API endpoint',
    category: 'main_slides',
    defaultSettings: {
      title: 'New Data Widget',
      showTitle: true,
      gridSize: 'medium',
      backgroundColor: '#0F172A',
      displayLimit: 10,
    },
    tags: ['data', 'api', 'dynamic'],
  },
  {
    id: 'text-announcement',
    name: 'Text Announcement',
    description: 'Simple text announcement widget',
    category: 'main_slides',
    defaultSettings: {
      title: 'New Announcement',
      showTitle: true,
      gridSize: 'large',
      backgroundColor: '#1E293B',
      textColor: '#ffffff',
    },
    tags: ['text', 'announcement', 'static'],
  },
  {
    id: 'image-gallery',
    name: 'Image Gallery',
    description: 'Display images in gallery format',
    category: 'main_slides',
    defaultSettings: {
      title: 'Image Gallery',
      showTitle: true,
      gridSize: 'large',
      backgroundColor: '#0F172A',
      animationType: 'fade',
      animationDuration: 5000,
    },
    tags: ['image', 'gallery', 'media'],
  },
  {
    id: 'clock-timer',
    name: 'Clock & Timer',
    description: 'Advanced clock with multiple timezones',
    category: 'sidebar_widgets',
    defaultSettings: {
      title: 'World Clock',
      showTitle: true,
      gridSize: 'small',
      backgroundColor: '#1e293b',
      textColor: '#ffffff',
    },
    tags: ['time', 'clock', 'utility'],
  },
  {
    id: 'contact-info',
    name: 'Contact Information',
    description: 'Display contact information',
    category: 'sidebar_widgets',
    defaultSettings: {
      title: 'Contact Info',
      showTitle: true,
      gridSize: 'small',
      backgroundColor: '#1E293B',
    },
    tags: ['contact', 'info', 'static'],
  },
];

// Get system widgets for a building
export function getSystemWidgets(buildingId: number): KioskWidget[] {
  return SYSTEM_WIDGETS.map((widget, index) => ({
    ...widget,
    id: `system_${(widget.component || widget.name.replace(/\s+/g, '').toLowerCase())}_${buildingId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 1, // System user
  }));
}

// Get widget template by ID
export function getWidgetTemplate(templateId: string): WidgetTemplate | null {
  return WIDGET_TEMPLATES.find(template => template.id === templateId) || null;
}

// Validate widget settings
export function validateWidgetSettings(settings: WidgetSettings): string[] {
  const errors: string[] = [];

  if (settings.displayLimit && (settings.displayLimit < 1 || settings.displayLimit > 100)) {
    errors.push('Display limit must be between 1 and 100');
  }

  if (settings.animationDuration && (settings.animationDuration < 100 || settings.animationDuration > 30000)) {
    errors.push('Animation duration must be between 100ms and 30 seconds');
  }

  if (settings.backgroundColor && !/^#[0-9A-F]{6}$/i.test(settings.backgroundColor)) {
    errors.push('Background color must be a valid hex color');
  }

  if (settings.textColor && !/^#[0-9A-F]{6}$/i.test(settings.textColor)) {
    errors.push('Text color must be a valid hex color');
  }

  return errors;
}