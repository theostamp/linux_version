// Widget exports for the new kiosk application

export { default as DashboardWidget } from './DashboardWidget';
export { default as AnnouncementsWidget } from './AnnouncementsWidget';
export { default as VotesWidget } from './VotesWidget';
export { default as FinancialWidget } from './FinancialWidget';
export { default as EmergencyWidget } from './EmergencyWidget';
export { default as BuildingStatisticsWidget } from './BuildingStatisticsWidget';
export { default as MaintenanceWidget } from './MaintenanceWidget';
export { default as ProjectsWidget } from './ProjectsWidget';
export { default as TimeWidget } from './TimeWidget';
export { default as QRCodeWidget } from './QRCodeWidget';
export { default as WeatherWidget } from './WeatherWidget';
export { default as ManagerWidget } from './ManagerWidget';
export { default as CommunityWidget } from './CommunityWidget';

// Widget registry for dynamic rendering
import { WidgetId } from '@/types/kiosk';
import { lazy } from 'react';

// Lazy load widgets for better performance with error boundaries
const widgetRegistry: Record<WidgetId, React.ComponentType<any>> = {
  dashboard_overview: lazy(() => import('./DashboardWidget')),
  building_statistics: lazy(() => import('./BuildingStatisticsWidget')),
  emergency_contacts: lazy(() => import('./EmergencyWidget')),
  announcements: lazy(() => import('./AnnouncementsWidget')),
  votes: lazy(() => import('./VotesWidget')),
  financial_overview: lazy(() => import('./FinancialWidget')),
  maintenance_overview: lazy(() => import('./MaintenanceWidget')),
  projects_overview: lazy(() => import('./ProjectsWidget')),
  current_time: lazy(() => import('./TimeWidget')),
  qr_code_connection: lazy(() => import('./QRCodeWidget')),
  weather_widget_sidebar: lazy(() => import('./WeatherWidget')),
  weather_widget_topbar: lazy(() => import('./WeatherWidget')),
  internal_manager_info: lazy(() => import('./ManagerWidget')),
  community_message: lazy(() => import('./CommunityWidget')),
  advertising_banners_sidebar: lazy(() => import('./AdvertisingWidget')),
  advertising_banners_topbar: lazy(() => import('./AdvertisingWidget')),
  news_ticker: lazy(() => import('./NewsTickerWidget')),
};

// Error boundary component for widget loading failures
class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode; widgetId: string },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(`Widget ${this.props.widgetId} failed to load:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="text-sm text-red-300">Widget failed to load</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function getWidgetComponent(widgetId: WidgetId): React.ComponentType<any> | null {
  return widgetRegistry[widgetId] || null;
}

export function renderWidget(widgetId: WidgetId, props: any) {
  const WidgetComponent = getWidgetComponent(widgetId);
  
  if (!WidgetComponent) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300">
        <div className="text-center">
          <div className="text-2xl mb-2">❓</div>
          <p className="text-sm">Widget not found: {widgetId}</p>
        </div>
      </div>
    );
  }

  return (
    <WidgetErrorBoundary widgetId={widgetId}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
        </div>
      }>
        <WidgetComponent {...props} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}
