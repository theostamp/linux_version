export interface KioskWidget {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  position: WidgetPosition;
  enabled: boolean;
  order: number;
  settings?: Record<string, any>;
  // Canvas layout properties
  canvasPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  gridPosition?: {
    row: number;
    col: number;
    rowSpan: number;
    colSpan: number;
  };
}

export type WidgetCategory = 
  | 'main_slides'      // Κύρια slides (Dashboard, Announcements, etc.)
  | 'sidebar_widgets'  // Sidebar widgets (Time, Weather, QR, etc.)
  | 'top_bar_widgets'  // Top bar widgets (Weather, Banners)
  | 'special_widgets'; // Ειδικά widgets (News ticker, etc.)

export type WidgetPosition = 
  | 'main_content'     // Κύρια περιοχή περιεχομένου
  | 'sidebar'          // Πλευρική μπάρα
  | 'top_bar'          // Επάνω μπάρα
  | 'bottom_bar';      // Κάτω μπάρα (news ticker)

export interface WidgetConfig {
  widgets: KioskWidget[];
  defaultLayout: {
    mainSlides: string[];
    sidebarWidgets: string[];
    topBarWidgets: string[];
    specialWidgets: string[];
  };
  settings: {
    slideDuration: number;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  canvasLayout?: {
    gridSize: {
      rows: number;
      cols: number;
    };
    widgetPositions: Record<string, {
      row: number;
      col: number;
      rowSpan: number;
      colSpan: number;
    }>;
  };
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
  widget: KioskWidget;
}

// Available widgets configuration
export const AVAILABLE_WIDGETS: Omit<KioskWidget, 'enabled' | 'order'>[] = [
  // Main Slides
  {
    id: 'dashboard_overview',
    name: 'Επισκόπηση Κτιρίου',
    description: 'Συνολική επισκόπηση με τελευταία ανακοίνωση, οικονομικά, ψηφοφορίες, συντήρηση και έργα',
    category: 'main_slides',
    position: 'main_content',
  },
  {
    id: 'building_statistics',
    name: 'Στατιστικά Κτιρίου',
    description: 'Στατιστικά διαμερισμάτων, κατοίκων, parking και αποθηκών',
    category: 'main_slides',
    position: 'main_content',
  },
  {
    id: 'emergency_contacts',
    name: 'Τηλέφωνα Έκτακτης Ανάγκης',
    description: 'Τηλέφωνα έκτακτης ανάγκης και υπηρεσιών κτιρίου',
    category: 'main_slides',
    position: 'main_content',
  },
  {
    id: 'announcements',
    name: 'Ανακοινώσεις',
    description: 'Εμφάνιση ανακοινώσεων σε ζεύγη',
    category: 'main_slides',
    position: 'main_content',
  },
  {
    id: 'votes',
    name: 'Ψηφοφορίες',
    description: 'Εμφάνιση ενεργών ψηφοφοριών σε ζεύγη',
    category: 'main_slides',
    position: 'main_content',
  },
  {
    id: 'financial_overview',
    name: 'Οικονομική Επισκόπηση',
    description: 'Λεπτομερής οικονομική επισκόπηση και στατιστικά',
    category: 'main_slides',
    position: 'main_content',
  },
  {
    id: 'maintenance_overview',
    name: 'Υπηρεσίες & Συντήρηση',
    description: 'Κατάσταση συνεργείων και προγραμματισμένων έργων',
    category: 'main_slides',
    position: 'main_content',
  },
  {
    id: 'projects_overview',
    name: 'Προσφορές & Έργα',
    description: 'Ενεργά έργα, προσφορές και οικονομική επισκόπηση',
    category: 'main_slides',
    position: 'main_content',
  },

  // Sidebar Widgets
  {
    id: 'current_time',
    name: 'Τρέχουσα Ώρα',
    description: 'Εμφάνιση τρέχουσας ώρας και ημερομηνίας',
    category: 'sidebar_widgets',
    position: 'sidebar',
  },
  {
    id: 'qr_code_connection',
    name: 'Σύνδεση Κινητού',
    description: 'QR code για σύνδεση κινητών συσκευών',
    category: 'sidebar_widgets',
    position: 'sidebar',
  },
  {
    id: 'weather_widget_sidebar',
    name: 'Καιρός (Sidebar)',
    description: 'Λεπτομερής καιρός με πρόγνωση 3 ημερών',
    category: 'sidebar_widgets',
    position: 'sidebar',
  },
  {
    id: 'internal_manager_info',
    name: 'Εσωτερικός Διαχειριστής',
    description: 'Πληροφορίες εσωτερικού διαχειριστή',
    category: 'sidebar_widgets',
    position: 'sidebar',
  },
  {
    id: 'community_message',
    name: 'Μήνυμα Κοινότητας',
    description: 'Μήνυμα καλωσορίσματος για την κοινότητα',
    category: 'sidebar_widgets',
    position: 'sidebar',
  },
  {
    id: 'advertising_banners_sidebar',
    name: 'Χρήσιμες Υπηρεσίες',
    description: 'Διαφημιστικά banners με χρήσιμες υπηρεσίες',
    category: 'sidebar_widgets',
    position: 'sidebar',
  },

  // Top Bar Widgets
  {
    id: 'weather_widget_topbar',
    name: 'Καιρός (Top Bar)',
    description: 'Απλός καιρός στην επάνω μπάρα',
    category: 'top_bar_widgets',
    position: 'top_bar',
  },
  {
    id: 'advertising_banners_topbar',
    name: 'Διαφημιστικά Banners',
    description: '2 διαφημιστικά banners με rotation στην επάνω μπάρα',
    category: 'top_bar_widgets',
    position: 'top_bar',
  },

  // Special Widgets
  {
    id: 'news_ticker',
    name: 'News Ticker',
    description: 'Τρέχουσα γραμμή ειδήσεων στο κάτω μέρος',
    category: 'special_widgets',
    position: 'bottom_bar',
  },
];

// Default widget configuration
export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  widgets: AVAILABLE_WIDGETS.map((widget, index) => ({
    ...widget,
    enabled: true,
    order: index,
  })),
  defaultLayout: {
    mainSlides: [
      'dashboard_overview',
      'building_statistics', 
      'emergency_contacts',
      'announcements',
      'votes',
      'financial_overview',
      'maintenance_overview',
      'projects_overview',
    ],
    sidebarWidgets: [
      'current_time',
      'qr_code_connection',
      'weather_widget_sidebar',
      'internal_manager_info',
      'community_message',
      'advertising_banners_sidebar',
    ],
    topBarWidgets: [
      'weather_widget_topbar',
      'advertising_banners_topbar',
    ],
    specialWidgets: [
      'news_ticker',
    ],
  },
  settings: {
    slideDuration: 10,
    autoRefresh: true,
    refreshInterval: 30,
  },
};
