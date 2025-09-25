'use client';

import { useKioskWidgets } from '@/hooks/useKioskWidgets';
import { usePublicInfo } from '@/hooks/usePublicInfo';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/utils';
import { Announcement, Vote as VoteType, Building as BuildingType } from '@/lib/api';
import { fetchPublicMaintenanceCounters, fetchPublicScheduledMaintenance } from '@/lib/apiPublic';
import { 
  Bell,
  Calendar,
  Clock,
  MapPin,
  Users,
  Vote,
  AlertTriangle,
  Building,
  ExternalLink,
  Settings,
  Phone,
  Euro,
  Wrench,
  FileText,
  TrendingUp,
  Globe,
  Home,
  Shield,
  Flame,
  Heart,
  Droplets,
  UserCheck,
  DoorOpen,
  Car,
  Package,
  Thermometer,
  QrCode,
  MessageSquare,
  Megaphone,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Widget icons mapping
const WIDGET_ICONS: Record<string, any> = {
  dashboard_overview: Home,
  building_statistics: Building,
  emergency_contacts: Shield,
  announcements: Bell,
  votes: Vote,
  financial_overview: Euro,
  maintenance_overview: Wrench,
  projects_overview: FileText,
  current_time: Clock,
  qr_code_connection: QrCode,
  weather_widget_sidebar: Thermometer,
  weather_widget_topbar: Globe,
  internal_manager_info: Users,
  community_message: MessageSquare,
  advertising_banners_sidebar: Megaphone,
  advertising_banners_topbar: ExternalLink,
  news_ticker: TrendingUp,
};

interface KioskCanvasRendererProps {
  selectedBuildingId?: number | null;
  onBuildingChange?: (buildingId: number | null) => void;
}

export default function KioskCanvasRenderer({ 
  selectedBuildingId, 
  onBuildingChange 
}: KioskCanvasRendererProps) {
  const [maintenanceInfo, setMaintenanceInfo] = useState({
    active_contractors: 0,
    pending_receipts: 0,
    scheduled_maintenance: 0,
    urgent_maintenance: 0,
  });

  // Use the widget system
  const { config } = useKioskWidgets(selectedBuildingId ?? undefined);

  // Use the selected building ID for data fetching
  const { data, isLoading, error, isFetching } = usePublicInfo(selectedBuildingId ?? null);

  // Load maintenance info
  useEffect(() => {
    const loadMaintenanceInfo = async () => {
      if (selectedBuildingId) {
        try {
          const [counters, scheduled] = await Promise.all([
            fetchPublicMaintenanceCounters(selectedBuildingId),
            fetchPublicScheduledMaintenance({ building: selectedBuildingId })
          ]);
          
          setMaintenanceInfo({
            active_contractors: counters.active_contractors || 0,
            pending_receipts: counters.pending_receipts || 0,
            scheduled_maintenance: scheduled.length || 0,
            urgent_maintenance: counters.urgent_maintenance || 0,
          });
        } catch (error) {
          console.error('Failed to load maintenance info:', error);
        }
      }
    };

    loadMaintenanceInfo();
  }, [selectedBuildingId]);

  // Get widgets with grid positions
  const widgetsWithGrid = config.widgets.filter(widget => 
    widget.enabled && widget.gridPosition
  );

  // Get grid size from config or use default
  const gridSize = config.canvasLayout?.gridSize || { rows: 8, cols: 12 };

  // Render widget content based on widget ID
  const renderWidgetContent = (widget: any) => {
    switch (widget.id) {
      case 'dashboard_overview':
        return renderDashboardOverview();
      case 'building_statistics':
        return renderBuildingStatistics();
      case 'emergency_contacts':
        return renderEmergencyContacts();
      case 'announcements':
        return renderAnnouncements();
      case 'votes':
        return renderVotes();
      case 'financial_overview':
        return renderFinancialOverview();
      case 'maintenance_overview':
        return renderMaintenanceOverview();
      case 'projects_overview':
        return renderProjectsOverview();
      case 'current_time':
        return renderCurrentTime();
      case 'qr_code_connection':
        return renderQRCode();
      case 'weather_widget_sidebar':
        return renderWeatherSidebar();
      case 'internal_manager_info':
        return renderInternalManagerInfo();
      case 'community_message':
        return renderCommunityMessage();
      case 'advertising_banners_sidebar':
        return renderAdvertisingBanners();
      case 'news_ticker':
        return renderNewsTicker();
      default:
        return <div className="text-center text-gray-300 py-4">Widget: {widget.name}</div>;
    }
  };

  // Widget renderers
  const renderDashboardOverview = () => {
    const hasContent = (data?.announcements?.length || 0) > 0 || (data?.votes?.length || 0) > 0 ||
                      data?.financial_info || maintenanceInfo;

    if (!hasContent) {
      return (
        <div className="flex items-center justify-center h-full text-gray-300">
          <div className="text-center">
            <Bell className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Δεν υπάρχουν δεδομένα</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3 h-full">
        {/* Latest Announcement */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-3 rounded-xl border border-slate-600/30">
          {data?.announcements && data.announcements.length > 0 ? (
            <>
              <div className="flex items-center space-x-2 mb-2">
                <Bell className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-semibold text-sky-100">Τελευταία Ανακοίνωση</h3>
              </div>
              <h4 className="text-sm font-bold text-white mb-1 line-clamp-2">{data.announcements[0].title}</h4>
              <p className="text-xs text-slate-300 line-clamp-2">{data.announcements[0].description}</p>
              <div className="text-xs text-slate-400 mt-1">
                {safeFormatDate(data.announcements[0].created_at, 'dd/MM HH:mm', { locale: el })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <Bell className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Financial Info */}
        <div className="bg-gradient-to-br from-emerald-800/60 to-emerald-900/60 backdrop-blur-sm p-3 rounded-xl border border-emerald-600/30">
          {data?.financial_info ? (
            <>
              <div className="flex items-center space-x-2 mb-2">
                <Euro className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-emerald-100">Οικονομικά</h3>
              </div>
              <div className="text-lg font-bold text-white">{data.financial_info.collection_rate}%</div>
              <div className="text-xs text-emerald-200">Είσπραξη</div>
              <div className="w-full bg-emerald-900/50 rounded-full h-1.5 mt-1">
                <div className="bg-emerald-400 h-1.5 rounded-full"
                     style={{ width: `${data.financial_info.collection_rate}%` }}></div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-emerald-500">
              <Euro className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Active Vote */}
        <div className="bg-gradient-to-br from-violet-800/60 to-violet-900/60 backdrop-blur-sm p-3 rounded-xl border border-violet-600/30">
          {data?.votes && data.votes.length > 0 ? (
            <>
              <div className="flex items-center space-x-2 mb-1">
                <Vote className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-semibold text-violet-100">Ψηφοφορία</h3>
              </div>
              <h4 className="text-xs font-bold text-white line-clamp-2">{data.votes[0].title}</h4>
              <div className="text-xs text-violet-300 mt-1">
                {data.votes[0].total_votes || 0} ψήφοι
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-violet-500">
              <Vote className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Maintenance Status */}
        <div className="bg-gradient-to-br from-amber-800/60 to-amber-900/60 backdrop-blur-sm p-3 rounded-xl border border-amber-600/30">
          <div className="flex items-center space-x-2 mb-1">
            <Wrench className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-amber-100">Συντήρηση</h3>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="bg-amber-900/30 p-1 rounded text-center">
              <div className="text-amber-200">Συνεργεία</div>
              <div className="text-sm font-bold text-white">{maintenanceInfo.active_contractors}</div>
            </div>
            <div className="bg-red-900/30 p-1 rounded text-center">
              <div className="text-red-200">Επείγοντα</div>
              <div className="text-sm font-bold text-red-300">{maintenanceInfo.urgent_maintenance}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBuildingStatistics = () => {
    const totalApartments = data?.building_info?.apartments_count || 24;
    const occupiedApartments = Math.floor(totalApartments * 0.92);

    return (
      <div className="grid grid-cols-2 gap-2 h-full">
        <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 backdrop-blur-sm p-3 rounded-xl border border-emerald-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <DoorOpen className="w-4 h-4 text-emerald-300" />
            <h3 className="text-xs font-semibold text-white">Διαμερίσματα</h3>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{totalApartments}</div>
            <div className="text-xs text-emerald-200">Σύνολο</div>
          </div>
          <div className="text-xs text-center text-emerald-200 mt-1">
            {occupiedApartments} κατοικημένα
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-3 rounded-xl border border-blue-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <UserCheck className="w-4 h-4 text-blue-300" />
            <h3 className="text-xs font-semibold text-white">Κάτοικοι</h3>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{occupiedApartments * 3}</div>
            <div className="text-xs text-blue-200">Εγγεγραμμένοι</div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmergencyContacts = () => (
    <div className="text-center text-gray-300 py-4">
      <Shield className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm">Τηλέφωνα Έκτακτης Ανάγκης</p>
    </div>
  );

  const renderAnnouncements = () => {
    if (!data?.announcements || data.announcements.length === 0) {
      return (
        <div className="text-center text-gray-300 py-4">
          <Bell className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Δεν υπάρχουν ανακοινώσεις</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 h-full overflow-y-auto">
        {data.announcements.slice(0, 3).map((announcement, index) => (
          <div key={announcement.id} className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-3 rounded-xl border border-blue-500/30">
            <h3 className="text-sm font-semibold mb-1 text-white line-clamp-1">{announcement.title}</h3>
            <p className="text-xs opacity-90 leading-relaxed text-blue-100 line-clamp-2">{announcement.description}</p>
            <div className="flex items-center text-xs opacity-75 mt-1">
              <Calendar className="w-3 h-3 mr-1 text-blue-300" />
              {safeFormatDate(announcement.created_at, 'dd/MM/yyyy', { locale: el })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVotes = () => {
    if (!data?.votes || data.votes.length === 0) {
      return (
        <div className="text-center text-gray-300 py-4">
          <Vote className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Δεν υπάρχουν ενεργές ψηφοφορίες</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 h-full overflow-y-auto">
        {data.votes.slice(0, 2).map((vote, index) => (
          <div key={vote.id} className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-3 rounded-xl border border-green-500/30">
            <h3 className="text-sm font-semibold mb-1 text-white line-clamp-1">{vote.title}</h3>
            <p className="text-xs opacity-90 leading-relaxed text-green-100 line-clamp-2">{vote.description}</p>
            <div className="flex items-center justify-between text-xs opacity-75 mt-1">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1 text-green-300" />
                {safeFormatDate(vote.end_date, 'dd/MM', { locale: el })}
              </div>
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-1 text-green-300" />
                {vote.total_votes || 0}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFinancialOverview = () => (
    <div className="text-center text-gray-300 py-4">
      <Euro className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm">Οικονομική Επισκόπηση</p>
    </div>
  );

  const renderMaintenanceOverview = () => (
    <div className="text-center text-gray-300 py-4">
      <Wrench className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm">Υπηρεσίες & Συντήρηση</p>
    </div>
  );

  const renderProjectsOverview = () => (
    <div className="text-center text-gray-300 py-4">
      <FileText className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm">Προσφορές & Έργα</p>
    </div>
  );

  const renderCurrentTime = () => (
    <div className="text-center py-4">
      <div className="text-2xl font-bold text-white mb-1">
        {format(new Date(), 'HH:mm', { locale: el })}
      </div>
      <div className="text-sm text-gray-300">
        {format(new Date(), 'EEEE, dd MMMM', { locale: el })}
      </div>
    </div>
  );

  const renderQRCode = () => (
    <div className="text-center py-4">
      <QrCode className="w-12 h-12 mx-auto mb-2 text-blue-300" />
      <p className="text-xs text-gray-300">Σύνδεση Κινητού</p>
    </div>
  );

  const renderWeatherSidebar = () => (
    <div className="text-center py-4">
      <Thermometer className="w-8 h-8 mx-auto mb-2 text-blue-300" />
      <p className="text-sm text-gray-300">Καιρός</p>
    </div>
  );

  const renderInternalManagerInfo = () => (
    <div className="text-center py-4">
      <Users className="w-8 h-8 mx-auto mb-2 text-blue-300" />
      <p className="text-xs text-gray-300">Εσωτερικός Διαχειριστής</p>
    </div>
  );

  const renderCommunityMessage = () => (
    <div className="text-center py-4">
      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-300" />
      <p className="text-xs text-gray-300">Μήνυμα Κοινότητας</p>
    </div>
  );

  const renderAdvertisingBanners = () => (
    <div className="text-center py-4">
      <Megaphone className="w-8 h-8 mx-auto mb-2 text-blue-300" />
      <p className="text-xs text-gray-300">Χρήσιμες Υπηρεσίες</p>
    </div>
  );

  const renderNewsTicker = () => (
    <div className="text-center py-4">
      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-300" />
      <p className="text-xs text-gray-300">News Ticker</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Σφάλμα Φόρτωσης</h1>
          <p className="text-red-200 text-lg mb-6">
            Δεν ήταν δυνατή η φόρτωση των πληροφοριών.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen text-white overflow-hidden font-ubuntu bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Building Info Bar */}
      <div className="bg-black bg-opacity-30 p-2 sm:p-3 flex-shrink-0">
        <div className="flex items-center justify-center max-w-full overflow-hidden">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 overflow-hidden">
            <Building className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-blue-300" />
            <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm min-w-0 overflow-hidden">
              <div className="flex items-center space-x-1 min-w-0 overflow-hidden">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-blue-300" />
                <span className="truncate font-medium text-white">{data?.building_info?.address || 'Όλα τα κτίρια'}</span>
                {isLoading && (
                  <div className="flex items-center space-x-1 ml-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-300"></div>
                    <span className="text-xs text-blue-300">Φόρτωση...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="w-px h-8 bg-white bg-opacity-20 mx-4 flex-shrink-0"></div>
          
          <div className="flex items-center justify-center space-x-4 flex-shrink-0">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-300" />
                <span className="text-xs sm:text-sm opacity-75">Εταιρεία Διαχείρισης</span>
              </div>
              <div className="text-sm sm:text-base font-semibold text-white">
                Compuyterme
              </div>
              <div className="text-xs sm:text-sm opacity-75">
                21055566368
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Grid */}
      <div className="flex-1 p-4 overflow-hidden">
        <div 
          className="grid gap-2 h-full"
          style={{
            gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
          }}
        >
          {Array.from({ length: gridSize.rows }, (_, row) =>
            Array.from({ length: gridSize.cols }, (_, col) => {
              // Find widget at this position
              const widget = widgetsWithGrid.find(w => 
                w.gridPosition &&
                w.gridPosition.row <= row &&
                w.gridPosition.row + w.gridPosition.rowSpan > row &&
                w.gridPosition.col <= col &&
                w.gridPosition.col + w.gridPosition.colSpan > col
              );

              // Only render the widget in its top-left cell
              const isFirstCell = widget &&
                widget.gridPosition?.row === row &&
                widget.gridPosition?.col === col;

              if (!isFirstCell) {
                return <div key={`${row}-${col}`} className="bg-transparent"></div>;
              }

              const IconComponent = WIDGET_ICONS[widget.id] || Settings;

              return (
                <div
                  key={`${row}-${col}`}
                  className="bg-gradient-to-br from-slate-900/50 via-blue-900/30 to-indigo-900/50 backdrop-blur-sm rounded-xl border border-blue-500/20 shadow-lg overflow-hidden"
                  style={{
                    gridRow: `span ${widget.gridPosition?.rowSpan || 1}`,
                    gridColumn: `span ${widget.gridPosition?.colSpan || 1}`,
                  }}
                >
                  {/* Widget Header */}
                  <div className="bg-black bg-opacity-20 p-2 border-b border-blue-500/20">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="w-4 h-4 text-blue-300 flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-white truncate">{widget.name}</h3>
                    </div>
                  </div>
                  
                  {/* Widget Content */}
                  <div className="p-3 h-full overflow-hidden">
                    {renderWidgetContent(widget)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
