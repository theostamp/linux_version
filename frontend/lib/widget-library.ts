// Widget Library - Εκτεταμένη βιβλιοθήκη widgets για το kiosk

export interface WidgetLibraryItem {
  id: string;
  name: string;
  greekName: string;
  description: string;
  greekDescription: string;
  category: 'main_slides' | 'sidebar_widgets' | 'top_bar_widgets' | 'special_widgets';
  icon: string;
  enabled: boolean;
  order: number;
  settings: any;
  component: string; // Component name to render
  dataSource?: string; // API endpoint for data
  isCustom: boolean; // If it's a custom widget vs built-in
}

// Built-in widgets
export const BUILT_IN_WIDGETS: WidgetLibraryItem[] = [
  {
    id: 'dashboard_overview',
    name: 'Dashboard Overview',
    greekName: 'Επισκόπηση Κτιρίου',
    description: 'Overall building overview and information',
    greekDescription: 'Συνολική επισκόπηση και πληροφορίες του κτιρίου',
    category: 'main_slides',
    icon: 'Building2',
    enabled: true,
    order: 1,
    settings: {},
    component: 'DashboardWidget',
    dataSource: '/api/public-info',
    isCustom: false
  },
  {
    id: 'building_statistics',
    name: 'Building Statistics',
    greekName: 'Στατιστικά Κτιρίου',
    description: 'Basic building statistics and information',
    greekDescription: 'Βασικά στατιστικά και πληροφορίες του κτιρίου',
    category: 'main_slides',
    icon: 'Users',
    enabled: true,
    order: 0,
    settings: {},
    component: 'BuildingStatisticsWidget',
    dataSource: '/api/public-info',
    isCustom: false
  },
  {
    id: 'emergency_contacts',
    name: 'Emergency Contacts',
    greekName: 'Τηλέφωνα Έκτακτης Ανάγκης',
    description: 'Emergency phone numbers and safety contacts',
    greekDescription: 'Τηλέφωνα έκτακτης ανάγκης και ασφαλείας',
    category: 'main_slides',
    icon: 'Phone',
    enabled: true,
    order: 2,
    settings: {},
    component: 'EmergencyWidget',
    isCustom: false
  },
  {
    id: 'announcements',
    name: 'Announcements',
    greekName: 'Ανακοινώσεις',
    description: 'Latest announcements and news',
    greekDescription: 'Τελευταίες ανακοινώσεις και νέα',
    category: 'main_slides',
    icon: 'Bell',
    enabled: true,
    order: 3,
    settings: {},
    component: 'AnnouncementsWidget',
    dataSource: '/api/announcements',
    isCustom: false
  },
  {
    id: 'votes',
    name: 'Votes',
    greekName: 'Ψηφοφορίες',
    description: 'Active voting sessions and decisions',
    greekDescription: 'Ενεργές ψηφοφορίες και αποφάσεις',
    category: 'main_slides',
    icon: 'Vote',
    enabled: true,
    order: 4,
    settings: {},
    component: 'VotesWidget',
    dataSource: '/api/votes',
    isCustom: false
  }
];

// Custom widgets library - Initialize from localStorage if available
const STORAGE_KEY = 'kiosk_custom_widgets';

// Load custom widgets from localStorage
const loadCustomWidgets = (): WidgetLibraryItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading custom widgets from localStorage:', error);
    return [];
  }
};

// Save custom widgets to localStorage
const saveCustomWidgets = (widgets: WidgetLibraryItem[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch (error) {
    console.error('Error saving custom widgets to localStorage:', error);
  }
};

// Initialize with default custom widgets + loaded from localStorage
const defaultCustomWidgets: WidgetLibraryItem[] = [
  {
    id: 'common_expenses_bill',
    name: 'Common Expenses Bill',
    greekName: 'Φύλλο Κοινόχρηστων',
    description: 'Display current month common expenses bill',
    greekDescription: 'Εμφάνιση φύλλου κοινόχρηστων του τρέχοντος μήνα',
    category: 'main_slides',
    icon: 'Receipt',
    enabled: false,
    order: 10,
    settings: {
      showBreakdown: true,
      showPaymentStatus: true,
      showDueDate: true
    },
    component: 'CommonExpensesBillWidget',
    dataSource: '/api/financial/common-expenses',
    isCustom: true
  },
  {
    id: 'heating_consumption_chart',
    name: 'Heating Consumption Chart',
    greekName: 'Διάγραμμα Κατανάλωσης Θέρμανσης',
    description: 'Visual chart of heating consumption over time',
    greekDescription: 'Διάγραμμα κατανάλωσης θέρμανσης ανά χρόνο',
    category: 'main_slides',
    icon: 'Thermometer',
    enabled: false,
    order: 11,
    settings: {
      chartType: 'line',
      timeRange: '12months',
      showComparison: true
    },
    component: 'HeatingConsumptionChartWidget',
    dataSource: '/api/financial/heating-consumption',
    isCustom: true
  },
  {
    id: 'airbnb_apartments_info',
    name: 'Airbnb Apartments Information',
    greekName: 'Πληροφορίες Airbnb Διαμερισμάτων',
    description: 'Information for Airbnb apartments with multilingual content',
    greekDescription: 'Πληροφορίες για διαμερίσματα Airbnb με πολύγλωσσο περιεχόμενο',
    category: 'main_slides',
    icon: 'Home',
    enabled: false,
    order: 12,
    settings: {
      languages: ['el', 'en'],
      showQuietHours: true,
      showWelcomeMessage: true,
      showHouseRules: true,
      showContactInfo: true
    },
    component: 'AirbnbInfoWidget',
    dataSource: '/api/apartments/airbnb-info',
    isCustom: true
  },
  {
    id: 'building_energy_monitor',
    name: 'Building Energy Monitor',
    greekName: 'Μονιτορισμός Ενέργειας Κτιρίου',
    description: 'Real-time energy consumption monitoring',
    greekDescription: 'Μονιτορισμός κατανάλωσης ενέργειας σε πραγματικό χρόνο',
    category: 'main_slides',
    icon: 'Zap',
    enabled: false,
    order: 13,
    settings: {
      showRealTime: true,
      showDailyAverage: true,
      showCosts: true,
      showEfficiency: true
    },
    component: 'EnergyMonitorWidget',
    dataSource: '/api/monitoring/energy',
    isCustom: true
  },
  {
    id: 'security_alerts',
    name: 'Security Alerts',
    greekName: 'Ειδοποιήσεις Ασφαλείας',
    description: 'Security system status and alerts',
    greekDescription: 'Κατάσταση συστήματος ασφαλείας και ειδοποιήσεις',
    category: 'main_slides',
    icon: 'Shield',
    enabled: false,
    order: 14,
    settings: {
      showSystemStatus: true,
      showRecentAlerts: true,
      showEmergencyContacts: true
    },
    component: 'SecurityAlertsWidget',
    dataSource: '/api/security/alerts',
    isCustom: true
  },
  {
    id: 'parking_availability',
    name: 'Parking Availability',
    greekName: 'Διαθεσιμότητα Χώρων Στάθμευσης',
    description: 'Real-time parking space availability',
    greekDescription: 'Διαθεσιμότητα χώρων στάθμευσης σε πραγματικό χρόνο',
    category: 'main_slides',
    icon: 'Car',
    enabled: false,
    order: 15,
    settings: {
      showTotalSpaces: true,
      showAvailableSpaces: true,
      showReservedSpaces: true,
      updateInterval: 30
    },
    component: 'ParkingAvailabilityWidget',
    dataSource: '/api/parking/availability',
    isCustom: true
  },
  {
    id: 'building_events_calendar',
    name: 'Building Events Calendar',
    greekName: 'Ημερολόγιο Εκδηλώσεων Κτιρίου',
    description: 'Upcoming building events and activities',
    greekDescription: 'Επερχόμενες εκδηλώσεις και δραστηριότητες του κτιρίου',
    category: 'main_slides',
    icon: 'Calendar',
    enabled: false,
    order: 16,
    settings: {
      showUpcomingEvents: true,
      showEventDetails: true,
      showRSVP: true,
      daysAhead: 30
    },
    component: 'EventsCalendarWidget',
    dataSource: '/api/events/upcoming',
    isCustom: true
  },
  {
    id: 'waste_management_schedule',
    name: 'Waste Management Schedule',
    greekName: 'Πρόγραμμα Διαχείρισης Αποβλήτων',
    description: 'Waste collection schedule and recycling information',
    greekDescription: 'Πρόγραμμα συλλογής αποβλήτων και πληροφορίες ανακύκλωσης',
    category: 'main_slides',
    icon: 'Recycle',
    enabled: false,
    order: 17,
    settings: {
      showCollectionSchedule: true,
      showRecyclingGuide: true,
      showSpecialCollections: true,
      showReminders: true
    },
    component: 'WasteManagementWidget',
    dataSource: '/api/waste/schedule',
    isCustom: true
  }
];

// Initialize custom widgets with defaults + localStorage
export const CUSTOM_WIDGETS: WidgetLibraryItem[] = (() => {
  const stored = loadCustomWidgets();
  const loadedIds = stored.map(w => w.id);
  
  // Merge default custom widgets with stored ones (avoiding duplicates)
  const merged = [...defaultCustomWidgets];
  
  stored.forEach(storedWidget => {
    if (!loadedIds.includes(storedWidget.id) || !defaultCustomWidgets.some(w => w.id === storedWidget.id)) {
      merged.push(storedWidget);
    }
  });
  
  return merged;
})();

// Get all available widgets
export const getAllWidgets = (): WidgetLibraryItem[] => {
  return [...BUILT_IN_WIDGETS, ...CUSTOM_WIDGETS];
};

// Get widgets by category
export const getWidgetsByCategory = (category: string): WidgetLibraryItem[] => {
  return getAllWidgets().filter(widget => widget.category === category);
};

// Get enabled widgets
export const getEnabledWidgets = (): WidgetLibraryItem[] => {
  return getAllWidgets().filter(widget => widget.enabled);
};

// Toggle widget enabled status
export const toggleWidget = (widgetId: string, enabled: boolean): WidgetLibraryItem[] => {
  const widgets = getAllWidgets();
  const widget = widgets.find(w => w.id === widgetId);
  if (widget) {
    widget.enabled = enabled;
    // Save to localStorage if it's a custom widget
    if (widget.isCustom) {
      saveCustomWidgets(CUSTOM_WIDGETS);
    }
  }
  return widgets;
};

// Get widget by ID
export const getWidgetById = (widgetId: string): WidgetLibraryItem | undefined => {
  return getAllWidgets().find(widget => widget.id === widgetId);
};

// Update widget settings
export const updateWidgetSettings = (widgetId: string, settings: any): WidgetLibraryItem[] => {
  const widgets = getAllWidgets();
  const widget = widgets.find(w => w.id === widgetId);
  if (widget) {
    widget.settings = { ...widget.settings, ...settings };
    // Save to localStorage if it's a custom widget
    if (widget.isCustom) {
      saveCustomWidgets(CUSTOM_WIDGETS);
    }
  }
  return widgets;
};

// Update widget order
export const updateWidgetOrder = (widgetId: string, newOrder: number): WidgetLibraryItem[] => {
  const widgets = getAllWidgets();
  const widget = widgets.find(w => w.id === widgetId);
  if (widget) {
    widget.order = newOrder;
    // Save to localStorage if it's a custom widget
    if (widget.isCustom) {
      saveCustomWidgets(CUSTOM_WIDGETS);
    }
  }
  return widgets;
};

// Add new widget
export const addNewWidget = (newWidget: Omit<WidgetLibraryItem, 'order'>): WidgetLibraryItem[] => {
  const widgets = getAllWidgets();
  const maxOrder = Math.max(...widgets.map(w => w.order), 0);
  
  const widget: WidgetLibraryItem = {
    ...newWidget,
    order: maxOrder + 1,
    isCustom: true
  };
  
  // Add to custom widgets array
  CUSTOM_WIDGETS.push(widget);
  
  // Save to localStorage
  saveCustomWidgets(CUSTOM_WIDGETS);
  
  return getAllWidgets();
};

// Remove widget
export const removeWidget = (widgetId: string): WidgetLibraryItem[] => {
  const index = CUSTOM_WIDGETS.findIndex(w => w.id === widgetId);
  if (index > -1) {
    CUSTOM_WIDGETS.splice(index, 1);
    // Save to localStorage
    saveCustomWidgets(CUSTOM_WIDGETS);
  }
  return getAllWidgets();
};

// Check if widget ID exists
export const widgetIdExists = (widgetId: string): boolean => {
  return getAllWidgets().some(w => w.id === widgetId);
};

// Clear all custom widgets from localStorage
export const clearCustomWidgets = (): WidgetLibraryItem[] => {
  CUSTOM_WIDGETS.splice(0, CUSTOM_WIDGETS.length);
  saveCustomWidgets([]);
  return getAllWidgets();
};

// Reload widgets from localStorage
export const reloadWidgets = (): WidgetLibraryItem[] => {
  const stored = loadCustomWidgets();
  CUSTOM_WIDGETS.splice(0, CUSTOM_WIDGETS.length, ...stored);
  return getAllWidgets();
};
