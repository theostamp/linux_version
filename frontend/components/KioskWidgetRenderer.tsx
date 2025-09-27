'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useKeenSlider } from 'keen-slider/react';
import { useKioskWidgets } from '@/hooks/useKioskWidgets';
import { usePublicInfo } from '@/hooks/usePublicInfo';
import { useBuildingChange } from '@/hooks/useBuildingChange';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/utils';
import { Announcement, Vote as VoteType, Building as BuildingType } from '@/lib/api';
import { fetchPublicMaintenanceCounters, fetchPublicScheduledMaintenance } from '@/lib/apiPublic';
import BuildingSelector from './BuildingSelector';
import DataStatusIndicator from './DataStatusIndicator';
import KioskMultilingualMessageCard from './KioskMultilingualMessageCard';
import KioskTopBar from './KioskTopBar';
import KioskSidebar from './KioskSidebar';

// Import all the slide creation functions from KioskMode
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
} from 'lucide-react';

interface KioskWidgetRendererProps {
  selectedBuildingId?: number | null;
  onBuildingChange?: (buildingId: number | null) => void;
}

export default function KioskWidgetRenderer({ 
  selectedBuildingId, 
  onBuildingChange 
}: KioskWidgetRendererProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState({
    active_contractors: 0,
    pending_receipts: 0,
    scheduled_maintenance: 0,
    urgent_maintenance: 0,
  });

  const sliderRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use the widget system
  const { config, getEnabledWidgets } = useKioskWidgets(selectedBuildingId ?? undefined);

  // Use the selected building ID for data fetching
  const { data, isLoading, error, isFetching } = usePublicInfo(selectedBuildingId ?? null);

  // Use the building change hook
  const { isChangingBuilding, changeBuilding } = useBuildingChange({
    onBuildingChange: (buildingId) => {
      onBuildingChange?.(buildingId);
    }
  });

  // Load maintenance info
  useEffect(() => {
    let isMounted = true;

    const loadMaintenanceInfo = async () => {
      if (selectedBuildingId && isMounted) {
        try {
          const [counters, scheduled] = await Promise.all([
            fetchPublicMaintenanceCounters(selectedBuildingId),
            fetchPublicScheduledMaintenance({ building: selectedBuildingId })
          ]);

          if (isMounted) {
            setMaintenanceInfo({
              active_contractors: counters.active_contractors || 0,
              pending_receipts: counters.pending_receipts || 0,
              scheduled_maintenance: scheduled.length || 0,
              urgent_maintenance: counters.urgent_maintenance || 0,
            });
          }
        } catch (error) {
          if (isMounted) {
            console.error('Failed to load maintenance info:', error);
          }
        }
      }
    };

    loadMaintenanceInfo();

    return () => {
      isMounted = false;
    };
  }, [selectedBuildingId]);

  const [sliderContainerRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1,
      spacing: 0,
    },
    renderMode: 'performance',
    duration: 1000,
    created(s) {
      s.container.addEventListener('mouseenter', () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      });
      s.container.addEventListener('mouseleave', () => {
        startAutoSlide();
      });
    },
    slideChanged(s) {
      setCurrentSlide(s.track.details.rel);
    },
  });



  // Handle building selection
  const handleBuildingSelect = (building: any) => {
    if (building === null) {
      onBuildingChange?.(null);
    } else {
      const buildingId = typeof building === 'number' ? building : building.id;
      onBuildingChange?.(buildingId);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key === 'b') {
        event.preventDefault();
        setShowBuildingSelector(true);
      }
      
      if (event.key === 'Escape') {
        setShowBuildingSelector(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get enabled widgets by category (memoized to prevent re-computation)
  const enabledMainSlides = useMemo(() => getEnabledWidgets('main_slides'), [getEnabledWidgets]);
  const enabledSidebarWidgets = useMemo(() => getEnabledWidgets('sidebar_widgets'), [getEnabledWidgets]);
  const enabledTopBarWidgets = useMemo(() => getEnabledWidgets('top_bar_widgets'), [getEnabledWidgets]);
  const enabledSpecialWidgets = useMemo(() => getEnabledWidgets('special_widgets'), [getEnabledWidgets]);

  // Slide creation functions (copied from KioskMode)
  const createDashboardOverviewSlide = () => {
    const hasContent = (data?.announcements?.length || 0) > 0 || (data?.votes?.length || 0) > 0 ||
                      data?.financial_info || maintenanceInfo;

    if (!hasContent) return [];

    return [{
      id: 'dashboard-overview',
      title: 'Επισκόπηση Κτιρίου',
      icon: Home,
      content: (
        <div className="grid grid-cols-12 grid-rows-6 gap-3 h-full">
          {/* Top Section - Latest Announcement */}
          <div className="col-span-7 row-span-3 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-4 rounded-xl border border-slate-600/30 shadow-xl flex flex-col">
            {data?.announcements && data.announcements.length > 0 ? (
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <Bell className="w-5 h-5 text-sky-400" />
                  <h3 className="text-sm font-semibold text-sky-100">Τελευταία Ανακοίνωση</h3>
                </div>
                <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">{data.announcements[0].title}</h4>
                <p className="text-sm text-slate-300 flex-1 line-clamp-3">{data.announcements[0].description}</p>
                <div className="text-xs text-slate-400 mt-auto pt-2">
                  {safeFormatDate(data.announcements[0].created_at, 'dd/MM/yyyy HH:mm', { locale: el })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Δεν υπάρχουν ανακοινώσεις</p>
                </div>
              </div>
            )}
          </div>

          {/* Financial Quick Stats */}
          <div className="col-span-5 row-span-3 bg-gradient-to-br from-emerald-800/60 to-emerald-900/60 backdrop-blur-sm p-4 rounded-xl border border-emerald-600/30 shadow-xl">
            {data?.financial_info ? (
              <>
                <div className="flex items-center space-x-2 mb-3">
                  <Euro className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-emerald-100">Οικονομική Κατάσταση</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-emerald-200">Ποσοστό Είσπραξης</div>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-white">{data.financial_info.collection_rate}%</div>
                      <div className="flex-1 bg-emerald-900/50 rounded-full h-2">
                        <div className="bg-emerald-400 h-2 rounded-full transition-all"
                             style={{ width: `${data.financial_info.collection_rate}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-emerald-200">Εισπραχθέντα</div>
                      <div className="text-white font-semibold">€{data.financial_info.total_collected.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-emerald-200">Εκκρεμότητες</div>
                      <div className="text-yellow-300 font-semibold">{data.financial_info.pending_payments}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-emerald-500">
                <Euro className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Active Vote */}
          <div className="col-span-4 row-span-3 bg-gradient-to-br from-violet-800/60 to-violet-900/60 backdrop-blur-sm p-4 rounded-xl border border-violet-600/30 shadow-xl">
            {data?.votes && data.votes.length > 0 ? (
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <Vote className="w-5 h-5 text-violet-400" />
                  <h3 className="text-sm font-semibold text-violet-100">Ψηφοφορία</h3>
                </div>
                <h4 className="text-sm font-bold text-white mb-1 line-clamp-2">{data.votes[0].title}</h4>
                <p className="text-xs text-violet-200 line-clamp-2">{data.votes[0].description}</p>
                <div className="mt-auto pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-violet-300">
                    <span>Ψήφοι:</span>
                    <span className="font-semibold">{data.votes[0].total_votes || 0}</span>
                  </div>
                  <div className="text-violet-400">
                    Λήξη: {safeFormatDate(data.votes[0].end_date, 'dd/MM', { locale: el })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-violet-500">
                <Vote className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Maintenance Status */}
          <div className="col-span-4 row-span-3 bg-gradient-to-br from-amber-800/60 to-amber-900/60 backdrop-blur-sm p-4 rounded-xl border border-amber-600/30 shadow-xl">
            <div className="flex items-center space-x-2 mb-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-100">Συντήρηση</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-amber-900/30 p-2 rounded">
                <div className="text-amber-200">Συνεργεία</div>
                <div className="text-lg font-bold text-white">{maintenanceInfo.active_contractors}</div>
              </div>
              <div className="bg-amber-900/30 p-2 rounded">
                <div className="text-amber-200">Εκκρεμότητες</div>
                <div className="text-lg font-bold text-white">{maintenanceInfo.pending_receipts}</div>
              </div>
              <div className="bg-amber-900/30 p-2 rounded">
                <div className="text-amber-200">Προγραμματισμένα</div>
                <div className="text-lg font-bold text-white">{maintenanceInfo.scheduled_maintenance}</div>
              </div>
              <div className="bg-red-900/30 p-2 rounded">
                <div className="text-red-200">Επείγοντα</div>
                <div className="text-lg font-bold text-red-300">{maintenanceInfo.urgent_maintenance}</div>
              </div>
            </div>
          </div>

          {/* Projects Summary */}
          <div className="col-span-4 row-span-3 bg-gradient-to-br from-cyan-800/60 to-cyan-900/60 backdrop-blur-sm p-4 rounded-xl border border-cyan-600/30 shadow-xl">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-cyan-100">Έργα</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-cyan-200">Ενεργά Έργα</span>
                <span className="text-white font-bold text-base">3</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-cyan-200">Προσφορές</span>
                <span className="text-yellow-300 font-bold">2</span>
              </div>
              <div className="pt-2 border-t border-cyan-600/30">
                <div className="text-xs text-cyan-200">Προϋπολογισμός</div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">€45k</span>
                  <span className="text-xs text-cyan-300">διαθέσιμα</span>
                </div>
                <div className="w-full bg-cyan-900/50 rounded-full h-1.5 mt-1">
                  <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    }];
  };

  // Add other slide creation functions here...
  const createBuildingStatisticsSlide = () => {
    const totalApartments = data?.building_info?.apartments_count || 24;
    const occupiedApartments = Math.floor(totalApartments * 0.92);
    const parkingSpots = Math.floor(totalApartments * 1.5);
    const availableParking = Math.floor(parkingSpots * 0.15);

    return [{
      id: 'building-statistics',
      title: 'Στατιστικά Κτιρίου',
      icon: Building,
      content: (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
          {/* Occupancy Statistics */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 backdrop-blur-sm p-6 rounded-xl border border-emerald-500/30 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <DoorOpen className="w-6 h-6 text-emerald-300" />
              <h3 className="text-base font-semibold text-white">Διαμερίσματα</h3>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{totalApartments}</div>
                <div className="text-sm text-emerald-200">Σύνολο</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-900/30 p-2 rounded text-center">
                  <div className="text-emerald-300 font-bold">{occupiedApartments}</div>
                  <div className="text-emerald-100">Κατοικημένα</div>
                </div>
                <div className="bg-emerald-900/30 p-2 rounded text-center">
                  <div className="text-yellow-300 font-bold">{totalApartments - occupiedApartments}</div>
                  <div className="text-yellow-100">Διαθέσιμα</div>
                </div>
              </div>
              <div className="w-full bg-emerald-900/50 rounded-full h-2">
                <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${(occupiedApartments/totalApartments)*100}%` }}></div>
              </div>
              <div className="text-xs text-center text-emerald-200">
                Πληρότητα: {Math.round((occupiedApartments/totalApartments)*100)}%
              </div>
            </div>
          </div>

          {/* Residents Statistics */}
          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <UserCheck className="w-6 h-6 text-blue-300" />
              <h3 className="text-base font-semibold text-white">Κάτοικοι</h3>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{occupiedApartments * 3}</div>
                <div className="text-sm text-blue-200">Εγγεγραμμένοι</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-900/30 p-2 rounded text-center">
                  <div className="text-blue-300 font-bold">{Math.floor(occupiedApartments * 3 * 0.6)}</div>
                  <div className="text-blue-100">Ενήλικες</div>
                </div>
                <div className="bg-blue-900/30 p-2 rounded text-center">
                  <div className="text-cyan-300 font-bold">{Math.floor(occupiedApartments * 3 * 0.4)}</div>
                  <div className="text-cyan-100">Παιδιά</div>
                </div>
              </div>
              <div className="bg-blue-900/30 p-3 rounded">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-200">Μέσος όρος/διαμ.</span>
                  <span className="text-white font-bold">3.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Parking Statistics */}
          <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 backdrop-blur-sm p-6 rounded-xl border border-purple-500/30 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Car className="w-6 h-6 text-purple-300" />
              <h3 className="text-base font-semibold text-white">Parking</h3>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{parkingSpots}</div>
                <div className="text-sm text-purple-200">Θέσεις</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-purple-900/30 p-2 rounded text-center">
                  <div className="text-purple-300 font-bold">{parkingSpots - availableParking}</div>
                  <div className="text-purple-100">Κατειλημμένες</div>
                </div>
                <div className="bg-purple-900/30 p-2 rounded text-center">
                  <div className="text-green-300 font-bold">{availableParking}</div>
                  <div className="text-green-100">Διαθέσιμες</div>
                </div>
              </div>
              <div className="bg-purple-900/30 p-3 rounded">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-200">Υπόγειο</span>
                  <span className="text-white font-bold">-1 & -2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Statistics */}
          <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 backdrop-blur-sm p-6 rounded-xl border border-amber-500/30 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Package className="w-6 h-6 text-amber-300" />
              <h3 className="text-base font-semibold text-white">Αποθήκες</h3>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{totalApartments}</div>
                <div className="text-sm text-amber-200">Σύνολο</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-amber-900/30 p-2 rounded text-center">
                  <div className="text-amber-300 font-bold">{Math.floor(totalApartments * 0.85)}</div>
                  <div className="text-amber-100">Χρησιμοποιούνται</div>
                </div>
                <div className="bg-amber-900/30 p-2 rounded text-center">
                  <div className="text-green-300 font-bold">{Math.floor(totalApartments * 0.15)}</div>
                  <div className="text-green-100">Ελεύθερες</div>
                </div>
              </div>
              <div className="bg-amber-900/30 p-3 rounded">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-200">Μέσο μέγεθος</span>
                  <span className="text-white font-bold">4m²</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    }];
  };

  // Add placeholder functions for other slides
  const createEmergencyContactsSlide = () => [{
    id: 'emergency-contacts',
    title: 'Τηλέφωνα Έκτακτης Ανάγκης',
    icon: Shield,
    content: <div className="text-center text-gray-300 py-8">Emergency Contacts Slide</div>,
  }];

  const createAnnouncementSlides = () => {
    if (!data?.announcements || data.announcements.length === 0) {
      return [{
        id: 'announcements-empty',
        title: 'Ανακοινώσεις',
        icon: Bell,
        content: (
          <div className="text-center text-gray-300 py-8">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Δεν υπάρχουν ανακοινώσεις</p>
          </div>
        ),
      }];
    }

    return data.announcements.map((announcement, index) => ({
      id: `announcement-${announcement.id}`,
      title: `Ανακοίνωση ${index + 1}`,
      icon: Bell,
      content: (
        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30 shadow-lg">
          <h3 className="text-xl font-semibold mb-3 text-white">{announcement.title}</h3>
          <p className="text-sm opacity-90 mb-4 leading-relaxed text-blue-100">{announcement.description}</p>
          <div className="flex items-center text-xs opacity-75">
            <Calendar className="w-4 h-4 mr-1 text-blue-300" />
            {safeFormatDate(announcement.created_at, 'dd/MM/yyyy HH:mm', { locale: el })}
          </div>
        </div>
      ),
    }));
  };

  const createVoteSlides = () => {
    if (!data?.votes || data.votes.length === 0) {
      return [{
        id: 'votes-empty',
        title: 'Ψηφοφορίες',
        icon: Vote,
        content: (
          <div className="text-center text-gray-300 py-8">
            <Vote className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Δεν υπάρχουν ενεργές ψηφοφορίες</p>
          </div>
        ),
      }];
    }

    return data.votes.map((vote, index) => ({
      id: `vote-${vote.id}`,
      title: `Ψηφοφορία ${index + 1}`,
      icon: Vote,
      content: (
        <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-6 rounded-xl border border-green-500/30 shadow-lg">
          <h3 className="text-xl font-semibold mb-3 text-white">{vote.title}</h3>
          <p className="text-sm opacity-90 mb-4 leading-relaxed text-green-100">{vote.description}</p>
          <div className="flex items-center justify-between text-xs opacity-75">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-green-300" />
              Λήξη: {safeFormatDate(vote.end_date, 'dd/MM/yyyy', { locale: el })}
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1 text-green-300" />
              {vote.total_votes || 0} ψήφοι
            </div>
          </div>
        </div>
      ),
    }));
  };

  const createFinancialSlides = () => [{
    id: 'financial-overview',
    title: 'Οικονομική Επισκόπηση',
    icon: Euro,
    content: <div className="text-center text-gray-300 py-8">Financial Overview Slide</div>,
  }];

  const createMaintenanceSlides = () => [{
    id: 'maintenance-overview',
    title: 'Υπηρεσίες & Συντήρηση',
    icon: Wrench,
    content: <div className="text-center text-gray-300 py-8">Maintenance Overview Slide</div>,
  }];

  const createProjectsSlides = () => [{
    id: 'projects-overview',
    title: 'Προσφορές & Έργα',
    icon: FileText,
    content: <div className="text-center text-gray-300 py-8">Projects Overview Slide</div>,
  }];

  // Create slides based on enabled widgets (memoized)
  const slides = useMemo(() => {
    const slidesList: any[] = [];

    enabledMainSlides.forEach(widget => {
      switch (widget.id) {
        case 'dashboard_overview':
          slidesList.push(...createDashboardOverviewSlide());
          break;
        case 'building_statistics':
          slidesList.push(...createBuildingStatisticsSlide());
          break;
        case 'emergency_contacts':
          slidesList.push(...createEmergencyContactsSlide());
          break;
        case 'announcements':
          slidesList.push(...createAnnouncementSlides());
          break;
        case 'votes':
          slidesList.push(...createVoteSlides());
          break;
        case 'financial_overview':
          slidesList.push(...createFinancialSlides());
          break;
        case 'maintenance_overview':
          slidesList.push(...createMaintenanceSlides());
          break;
        case 'projects_overview':
          slidesList.push(...createProjectsSlides());
          break;
      }
    });

    return slidesList;
  }, [enabledMainSlides, data, maintenanceInfo]);

  // Auto-slide functionality (after slides are defined)
  const startAutoSlide = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Don't start auto-slide if no slides or not enough slides
    if (slides.length <= 1) {
      return;
    }

    const slideDuration = config?.settings?.slideDuration || 10;
    intervalRef.current = setInterval(() => {
      if (instanceRef && instanceRef.current) {
        try {
          // Additional check to ensure the slider is properly initialized
          if (instanceRef.current.track && instanceRef.current.track.details) {
            instanceRef.current.next();
          }
        } catch (error) {
          console.error('[KioskWidgetRenderer] Error in auto-slide:', error);
        }
      }
    }, slideDuration * 1000);
  }, [slides.length, config?.settings?.slideDuration]);

  // Start auto-slide when slider is ready and slides are available
  useEffect(() => {
    // Add a small delay to ensure slider is fully initialized
    const timer = setTimeout(() => {
      startAutoSlide();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoSlide]);

  return (
    <div className="h-screen w-screen text-white flex flex-col overflow-hidden font-ubuntu bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 max-w-full max-h-full">
      {/* Building Selector Modal */}
      <BuildingSelector
        isOpen={showBuildingSelector}
        onClose={() => setShowBuildingSelector(false)}
        onBuildingSelect={handleBuildingSelect}
        selectedBuilding={data?.building_info ? { 
          id: data.building_info.id, 
          name: data.building_info.name || '', 
          address: data.building_info.address || '' 
        } as BuildingType : null}
        currentBuilding={data?.building_info ? { 
          id: data.building_info.id, 
          name: data.building_info.name || '', 
          address: data.building_info.address || '' 
        } as BuildingType : null}
      />

      {/* Top Bar - Only show if widgets are enabled */}
      {enabledTopBarWidgets.length > 0 && <KioskTopBar buildingId={selectedBuildingId ?? undefined} />}

      {/* Building Info Bar */}
      <div className="bg-black bg-opacity-30 p-2 sm:p-3 flex-shrink-0 min-h-0">
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
          
          <div className="w-px h-8 bg-white bg-opacity-20 mx-4 flex-shrink-0"></div>
          
          <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0 overflow-hidden">
            <div className="text-right flex-shrink-0">
              <DataStatusIndicator
                isFetching={isFetching}
                isError={!!error}
                lastUpdated={data?.general_info?.last_updated}
                className="text-xs opacity-75"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content - Slides */}
        <div className="flex-1 p-2 sm:p-3 lg:p-6 overflow-hidden min-h-0 bg-gradient-to-br from-slate-900/50 via-blue-900/30 to-indigo-900/50 backdrop-blur-sm">
          <div ref={sliderRef} className="h-full overflow-hidden">
            <div
              ref={sliderContainerRef}
              className="keen-slider h-full overflow-hidden"
            >
              {slides.map((slide, index) => (
                <div key={slide.id} className="keen-slider__slide overflow-hidden">
                  <div className="h-full flex flex-col overflow-hidden">
                    <div className="flex items-center mb-3 sm:mb-4 lg:mb-6 flex-shrink-0 overflow-hidden">
                      <div className="flex items-center space-x-2 sm:space-x-2 lg:space-x-3 overflow-hidden">
                        <slide.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-300 flex-shrink-0" />
                        <h2 className="text-base sm:text-lg lg:text-2xl font-bold truncate text-white">{slide.title}</h2>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 lg:pr-4 pb-1 sm:pb-2 lg:pb-4 min-h-0">
                      <div className="h-full overflow-hidden">
                        {slide.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Only show if widgets are enabled */}
        {enabledSidebarWidgets.length > 0 && (
          <KioskSidebar buildingInfo={data?.building_info} />
        )}
      </div>

      {/* Navigation Dots */}
      {slides.length > 1 && (
        <div className="bg-black bg-opacity-30 p-2 sm:p-3 flex-shrink-0 min-h-0">
          <div className="flex justify-center space-x-1.5 sm:space-x-2 lg:space-x-3 overflow-hidden">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (instanceRef && instanceRef.current && instanceRef.current.track && instanceRef.current.track.details) {
                    try {
                      instanceRef.current.moveToIdx(index);
                    } catch (error) {
                      console.error('[KioskWidgetRenderer] Error calling moveToIdx():', error);
                    }
                  }
                }}
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-3 lg:h-3 rounded-full transition-colors duration-200 flex-shrink-0 ${
                  currentSlide === index
                    ? 'bg-white'
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* News Ticker - Only show if enabled */}
      {enabledSpecialWidgets.some(w => w.id === 'news_ticker') && (
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 bg-opacity-95 p-2 sm:p-3 overflow-hidden flex-shrink-0 min-h-0 border-t-2 border-white border-opacity-20 relative">
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 border border-blue-600 px-3 py-2 rounded-lg shadow-lg">
              <div className="text-sm font-bold text-white uppercase tracking-wide">
                NEWS
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 animate-marquee flex-1 ml-20">
              <span className="whitespace-nowrap text-white text-sm sm:text-base font-medium">
                Καλώς ήρθατε στο σύστημα διαχείρισης κτιρίων Compuyterme
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
          white-space: nowrap;
          transition: opacity 0.5s ease-in-out;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }

        .keen-slider__slide {
          opacity: 0;
          transform: scale(0.98);
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
        }

        .keen-slider__slide[aria-hidden="false"] {
          opacity: 1;
          transform: scale(1);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .keen-slider__slide[aria-hidden="false"] > div {
          animation: fadeInUp 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
