'use client';

import { useEffect, useState, useRef } from 'react';
import { useKeenSlider } from 'keen-slider/react';
import { Bell, Calendar, Clock, MapPin, Users, Vote, AlertTriangle, Building, ExternalLink, Settings, Phone, Euro, Wrench, FileText, TrendingUp, Globe, Home, Shield, Flame, Heart, Droplets, UserCheck, DoorOpen, Car, Package } from 'lucide-react';
import { Announcement, Vote as VoteType, Building as BuildingType } from '@/lib/api';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/utils';
import BuildingSelector from './BuildingSelector';
import DataStatusIndicator from './DataStatusIndicator';
import KioskMultilingualMessageCard from './KioskMultilingualMessageCard';

interface KioskModeProps {
  announcements: Announcement[];
  votes: VoteType[];
  buildingInfo?: {
    id: number;
    name: string;
    address: string;
    city?: string;
    postal_code?: string;
    apartments_count?: number;
    internal_manager_name?: string;
    internal_manager_phone?: string;
    management_office_name?: string;
    management_office_phone?: string;
    management_office_address?: string;
  };
  advertisingBanners?: Array<{
    id: number;
    title: string;
    description: string;
    image_url: string;
    link: string;
    duration: number;
  }>;
  generalInfo?: {
    current_time: string;
    current_date: string;
    system_status: string;
    last_updated: string;
  };
  // Νέα props για τα νέα modules
  financialInfo?: {
    total_payments: number;
    pending_payments: number;
    overdue_payments: number;
    total_collected: number;
    collection_rate: number;
  };
  maintenanceInfo?: {
    active_contractors: number;
    pending_receipts: number;
    scheduled_maintenance: number;
    urgent_maintenance: number;
  };
  projectsInfo?: {
    active_projects: number;
    pending_offers: number;
    active_contracts: number;
    total_budget: number;
    total_spent: number;
  };
  multilingualMessages?: Array<{
    id: number;
    language: string;
    title: string;
    content: string;
  }>;
  onBuildingChange?: (buildingId: number | null) => void;
  isLoading?: boolean;
  isError?: boolean;
  isFetching?: boolean;
}

export default function KioskMode({
  announcements,
  votes,
  buildingInfo,
  advertisingBanners = [],
  generalInfo,
  financialInfo,
  maintenanceInfo,
  projectsInfo,
  multilingualMessages = [],
  onBuildingChange,
  isLoading = false,
  isError = false,
  isFetching = false
}: KioskModeProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newsTicker, setNewsTicker] = useState<string>('');
  const [newsItems, setNewsItems] = useState<string[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [newsOpacity, setNewsOpacity] = useState(1);
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [sliderContainerRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1,
      spacing: 0,
    },
    renderMode: 'performance',
    duration: 1000, // Smooth transition duration
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

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-slide every 10 seconds
  const startAutoSlide = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      instanceRef.current?.next();
    }, 10000);
  };

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [instanceRef]);

  // Load fresh news ticker
  useEffect(() => {
    async function loadNews() {
      try {
        const response = await fetch('/api/news/multiple');
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            setNewsItems(data.items);
            setNewsTicker(data.items[0]);
            setCurrentNewsIndex(0);
          }
        }
      } catch (error) {
        setNewsTicker('Ενημερωθείτε για τα τελευταία νέα της Ελλάδας! 🇬🇷');
      }
    }
    loadNews();
    
    // Refresh news every 3 minutes for fresher content
    const interval = setInterval(loadNews, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);



  // Rotate news items every 12 seconds (faster for fresh news)
  useEffect(() => {
    if (newsItems.length > 1) {
      const newsInterval = setInterval(() => {
        setCurrentNewsIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % newsItems.length;
          
          // Fade out current text
          setNewsOpacity(0);
          
          // Change text after fade out
          setTimeout(() => {
            setNewsTicker(newsItems[nextIndex]);
            setNewsOpacity(1);
          }, 500); // Wait 500ms for fade out
          
          return nextIndex;
        });
      }, 12000); // 12 seconds per news item
      
      return () => clearInterval(newsInterval);
    }
  }, [newsItems]);

  // Keyboard shortcut handler - Ctrl + Alt + B
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl + Alt + B to open building selector
      if (event.ctrlKey && event.altKey && event.key === 'b') {
        event.preventDefault();
        setShowBuildingSelector(true);
      }
      
      // Escape to close building selector
      if (event.key === 'Escape') {
        setShowBuildingSelector(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle building selection
  const handleBuildingSelect = (building: any) => {
    if (building === null) {
      // Handle "Όλα τα Κτίρια" selection
      onBuildingChange?.(null);
    } else {
      // Handle specific building selection
      const buildingId = typeof building === 'number' ? building : building.id;
      onBuildingChange?.(buildingId);
    }
  };

  // Helper function to create announcement slides in pairs
  const createAnnouncementSlides = () => {
    if (announcements.length === 0) {
      return [{
        id: 'announcements-empty',
        title: 'Ανακοινώσεις',
        icon: Bell,
        content: (
          <div className="text-center text-kiosk-neutral-300 py-8">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50 text-kiosk-neutral-400" />
            <p className="text-lg">Δεν υπάρχουν ανακοινώσεις</p>
          </div>
        ),
      }];
    }

    const slides = [];
    for (let i = 0; i < announcements.length; i += 2) {
      const pair = announcements.slice(i, i + 2);
      slides.push({
        id: `announcements-${i}`,
        title: `Ανακοινώσεις ${slides.length + 1}`,
        icon: Bell,
        content: (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {pair.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-gradient-to-br from-kiosk-primary/40 to-kiosk-primary-light/40 backdrop-blur-sm p-6 rounded-xl border border-kiosk-primary/30 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start space-x-4 h-full">
                  <div className="flex-shrink-0">
                    <Bell className="w-8 h-8 text-kiosk-primary-lighter" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-xl font-semibold mb-3 text-white">
                      {announcement.title}
                    </h3>
                    <p className="text-sm opacity-90 mb-4 leading-relaxed flex-1 text-kiosk-neutral-200">
                      {announcement.description}
                    </p>
                    <div className="flex items-center text-xs opacity-75 mt-auto">
                      <Calendar className="w-4 h-4 mr-1 text-kiosk-primary-lighter" />
                      {safeFormatDate(announcement.created_at, 'dd/MM/yyyy HH:mm', { locale: el })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Fill empty space if odd number of announcements */}
            {pair.length === 1 && (
              <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 shadow-lg">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-blue-300 opacity-50">
                    <Bell className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">Επόμενη ανακοίνωση</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ),
      });
    }
    return slides;
  };

  // Dashboard Overview - Main slide with all key information
  const createDashboardOverviewSlide = () => {
    const hasContent = announcements.length > 0 || votes.length > 0 ||
                      financialInfo || maintenanceInfo || projectsInfo;

    if (!hasContent) return [];

    return [{
      id: 'dashboard-overview',
      title: 'Επισκόπηση Κτιρίου',
      icon: Home,
      content: (
        <div className="grid grid-cols-12 grid-rows-6 gap-3 h-full">
          {/* Top Section - Latest Announcement (spans 7 cols) */}
          <div className="col-span-7 row-span-3 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-4 rounded-xl border border-slate-600/30 shadow-xl flex flex-col">
            {announcements.length > 0 ? (
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <Bell className="w-5 h-5 text-sky-400" />
                  <h3 className="text-sm font-semibold text-sky-100">Τελευταία Ανακοίνωση</h3>
                </div>
                <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">{announcements[0].title}</h4>
                <p className="text-sm text-slate-300 flex-1 line-clamp-3">{announcements[0].description}</p>
                <div className="text-xs text-slate-400 mt-auto pt-2">
                  {safeFormatDate(announcements[0].created_at, 'dd/MM/yyyy HH:mm', { locale: el })}
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

          {/* Top Right - Financial Quick Stats (spans 5 cols) */}
          <div className="col-span-5 row-span-3 bg-gradient-to-br from-emerald-800/60 to-emerald-900/60 backdrop-blur-sm p-4 rounded-xl border border-emerald-600/30 shadow-xl">
            {financialInfo ? (
              <>
                <div className="flex items-center space-x-2 mb-3">
                  <Euro className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-emerald-100">Οικονομική Κατάσταση</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-emerald-200">Ποσοστό Είσπραξης</div>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-white">{financialInfo.collection_rate}%</div>
                      <div className="flex-1 bg-emerald-900/50 rounded-full h-2">
                        <div className="bg-emerald-400 h-2 rounded-full transition-all"
                             style={{ width: `${financialInfo.collection_rate}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-emerald-200">Εισπραχθέντα</div>
                      <div className="text-white font-semibold">€{financialInfo.total_collected.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-emerald-200">Εκκρεμότητες</div>
                      <div className="text-yellow-300 font-semibold">{financialInfo.pending_payments}</div>
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

          {/* Bottom Left - Active Vote (spans 4 cols) */}
          <div className="col-span-4 row-span-3 bg-gradient-to-br from-violet-800/60 to-violet-900/60 backdrop-blur-sm p-4 rounded-xl border border-violet-600/30 shadow-xl">
            {votes.length > 0 ? (
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <Vote className="w-5 h-5 text-violet-400" />
                  <h3 className="text-sm font-semibold text-violet-100">Ψηφοφορία</h3>
                </div>
                <h4 className="text-sm font-bold text-white mb-1 line-clamp-2">{votes[0].title}</h4>
                <p className="text-xs text-violet-200 line-clamp-2">{votes[0].description}</p>
                <div className="mt-auto pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-violet-300">
                    <span>Ψήφοι:</span>
                    <span className="font-semibold">{votes[0].total_votes || 0}</span>
                  </div>
                  <div className="text-violet-400">
                    Λήξη: {safeFormatDate(votes[0].end_date, 'dd/MM', { locale: el })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-violet-500">
                <Vote className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Bottom Middle - Maintenance Status (spans 4 cols) */}
          <div className="col-span-4 row-span-3 bg-gradient-to-br from-amber-800/60 to-amber-900/60 backdrop-blur-sm p-4 rounded-xl border border-amber-600/30 shadow-xl">
            {maintenanceInfo ? (
              <>
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
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-amber-500">
                <Wrench className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Bottom Right - Projects Summary (spans 4 cols) */}
          <div className="col-span-4 row-span-3 bg-gradient-to-br from-cyan-800/60 to-cyan-900/60 backdrop-blur-sm p-4 rounded-xl border border-cyan-600/30 shadow-xl">
            {projectsInfo ? (
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-cyan-100">Έργα</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-cyan-200">Ενεργά Έργα</span>
                    <span className="text-white font-bold text-base">{projectsInfo.active_projects}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-cyan-200">Προσφορές</span>
                    <span className="text-yellow-300 font-bold">{projectsInfo.pending_offers}</span>
                  </div>
                  <div className="pt-2 border-t border-cyan-600/30">
                    <div className="text-xs text-cyan-200">Προϋπολογισμός</div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">€{((projectsInfo.total_budget - projectsInfo.total_spent) / 1000).toFixed(0)}k</span>
                      <span className="text-xs text-cyan-300">διαθέσιμα</span>
                    </div>
                    <div className="w-full bg-cyan-900/50 rounded-full h-1.5 mt-1">
                      <div className="bg-cyan-400 h-1.5 rounded-full"
                           style={{ width: `${100 - Math.round((projectsInfo.total_spent / projectsInfo.total_budget) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-cyan-500">
                <FileText className="w-8 h-8" />
              </div>
            )}
          </div>
        </div>
      ),
    }];
  }

  // Helper function to create vote slides in pairs
  const createVoteSlides = () => {
    if (votes.length === 0) {
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

    const slides = [];
    for (let i = 0; i < votes.length; i += 2) {
      const pair = votes.slice(i, i + 2);
      slides.push({
        id: `votes-${i}`,
        title: `Ψηφοφορίες ${slides.length + 1}`,
        icon: Vote,
        content: (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {pair.map((vote) => (
              <div
                key={vote.id}
                className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-6 rounded-xl border border-green-500/30 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start space-x-4 h-full">
                  <div className="flex-shrink-0">
                    <Vote className="w-8 h-8 text-green-300" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-xl font-semibold mb-3 text-white">
                      {vote.title}
                    </h3>
                    <p className="text-sm opacity-90 mb-4 leading-relaxed flex-1 text-green-100">
                      {vote.description}
                    </p>
                    <div className="flex items-center justify-between text-xs opacity-75 mt-auto">
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
                </div>
              </div>
            ))}
            {/* Fill empty space if odd number of votes */}
            {pair.length === 1 && (
              <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-sm p-6 rounded-xl border border-green-500/20 shadow-lg">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-green-300 opacity-50">
                    <Vote className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">Επόμενη ψηφοφορία</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ),
      });
    }
    return slides;
  };

  // Helper function to create request slides in pairs (placeholder for future implementation)
  const createRequestSlides = () => {
    // This will be implemented when requests are added to the component
    return [];
  };

  // Helper function to create financial slides
  const createFinancialSlides = () => {
    if (!financialInfo) return [];

    return [{
      id: 'financial-overview',
      title: 'Οικονομική Επισκόπηση',
      icon: Euro,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-6 rounded-xl border border-green-500/30 shadow-lg">
            <div className="flex items-center space-x-4 mb-4">
              <Euro className="w-8 h-8 text-green-300" />
                              <h3 className="text-xl font-semibold text-white">Κατάσταση Εισπράξεων</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-green-100">Συνολικές Εισπράξεις</span>
                <span className="text-white font-bold text-lg">{financialInfo.total_payments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-100">Εκκρεμείς</span>
                <span className="text-yellow-300 font-bold">{financialInfo.pending_payments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-100">Ληξιπρόθεσμες</span>
                <span className="text-red-300 font-bold">{financialInfo.overdue_payments}</span>
              </div>
              <div className="pt-2 border-t border-green-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-green-100">Συνολικά Εισπραχθέντα</span>
                  <span className="text-white font-bold">€{financialInfo.total_collected.toLocaleString()}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm text-green-100">
                    <span>Ποσοστό Εισπράξεως</span>
                    <span>{financialInfo.collection_rate}%</span>
                  </div>
                  <div className="w-full bg-green-900/50 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-400 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${financialInfo.collection_rate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30 shadow-lg">
            <div className="flex items-center space-x-4 mb-4">
              <Building className="w-8 h-8 text-blue-300" />
              <h3 className="text-xl font-semibold text-white">Λογαριασμοί Κτιρίου</h3>
            </div>
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-blue-300 mb-2">3/4</div>
                <div className="text-blue-100 text-sm">Ενεργοί Λογαριασμοί</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-900/30 rounded-lg">
                  <div className="text-xl font-bold text-green-300">3</div>
                  <div className="text-xs text-green-100">Λειτουργικοί</div>
                </div>
                <div className="text-center p-3 bg-blue-900/30 rounded-lg">
                  <div className="text-xl font-bold text-blue-300">1</div>
                  <div className="text-xs text-blue-100">Αποθεματικό</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    }];
  };

  // Helper function to create maintenance slides
  const createMaintenanceSlides = () => {
    if (!maintenanceInfo) return [];

    return [{
      id: 'maintenance-overview',
      title: 'Υπηρεσίες',
      icon: Wrench,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <div className="bg-gradient-to-br from-orange-900/40 to-amber-900/40 backdrop-blur-sm p-6 rounded-xl border border-orange-500/30 shadow-lg">
            <div className="flex items-center space-x-4 mb-4">
              <Wrench className="w-8 h-8 text-orange-300" />
              <h3 className="text-xl font-semibold text-white">Κατάσταση Συνεργείων</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-orange-100">Ενεργά Συνεργεία</span>
                <span className="text-white font-bold text-lg">{maintenanceInfo.active_contractors}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-orange-100">Εκκρεμείς Αποδείξεις</span>
                <span className="text-yellow-300 font-bold">{maintenanceInfo.pending_receipts}</span>
              </div>
              <div className="pt-2 border-t border-orange-500/30">
                <div className="text-center py-2">
                  <div className="text-sm text-orange-100 mb-1">Τύποι Συνεργείων</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-orange-900/30 p-2 rounded">
                      <div className="text-orange-300 font-bold">5</div>
                      <div className="text-orange-100">Επισκευές</div>
                    </div>
                    <div className="bg-orange-900/30 p-2 rounded">
                      <div className="text-orange-300 font-bold">3</div>
                      <div className="text-orange-100">Καθαριότητα</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 backdrop-blur-sm p-6 rounded-xl border border-purple-500/30 shadow-lg">
            <div className="flex items-center space-x-4 mb-4">
              <Calendar className="w-8 h-8 text-purple-300" />
              <h3 className="text-xl font-semibold text-white">Προγραμματισμένα Έργα</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-100">Συνολικά Έργα</span>
                <span className="text-white font-bold text-lg">{maintenanceInfo.scheduled_maintenance}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-100">Επείγοντα</span>
                <span className="text-red-300 font-bold">{maintenanceInfo.urgent_maintenance}</span>
              </div>
              <div className="pt-2 border-t border-purple-500/30">
                <div className="text-center py-2">
                  <div className="text-sm text-purple-100 mb-1">Προσεχείς Έργα</div>
                  <div className="space-y-2 text-xs">
                    <div className="bg-purple-900/30 p-2 rounded">
                      <div className="text-purple-300 font-bold">Συντήρηση Ανελκυστήρα</div>
                      <div className="text-purple-100">Αύριο 09:00</div>
                    </div>
                    <div className="bg-purple-900/30 p-2 rounded">
                      <div className="text-purple-300 font-bold">Καθαρισμός Κοινοχρήστων</div>
                      <div className="text-purple-100">Μεθαύριο 14:00</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    }];
  };

  // Helper function to create building statistics slide
  const createBuildingStatisticsSlide = () => {
    const totalApartments = buildingInfo?.apartments_count || 24;
    const occupiedApartments = Math.floor(totalApartments * 0.92); // 92% occupancy
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

  // Helper function to create emergency contacts slide
  const createEmergencyContactsSlide = () => {
    return [{
      id: 'emergency-contacts',
      title: 'Τηλέφωνα Έκτακτης Ανάγκης',
      icon: Shield,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Essential Services */}
          <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 backdrop-blur-sm p-6 rounded-xl border border-red-500/30 shadow-lg">
            <div className="flex items-center space-x-4 mb-4">
              <Shield className="w-8 h-8 text-red-300" />
              <h3 className="text-xl font-semibold text-white">Υπηρεσίες Έκτακτης Ανάγκης</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-900/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Flame className="w-5 h-5 text-red-400" />
                  <span className="text-white">Πυροσβεστική</span>
                </div>
                <span className="text-2xl font-bold text-red-300">199</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-900/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Heart className="w-5 h-5 text-red-400" />
                  <span className="text-white">ΕΚΑΒ</span>
                </div>
                <span className="text-2xl font-bold text-red-300">166</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-900/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span className="text-white">Αστυνομία</span>
                </div>
                <span className="text-2xl font-bold text-blue-300">100</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-900/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-green-400" />
                  <span className="text-white">Ευρωπαϊκός Αριθμός</span>
                </div>
                <span className="text-2xl font-bold text-green-300">112</span>
              </div>
            </div>
          </div>

          {/* Building Services */}
          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30 shadow-lg">
            <div className="flex items-center space-x-4 mb-4">
              <Building className="w-8 h-8 text-blue-300" />
              <h3 className="text-xl font-semibold text-white">Υπηρεσίες Κτιρίου</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-900/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Wrench className="w-5 h-5 text-yellow-400" />
                  <span className="text-white">Συντηρητής</span>
                </div>
                <span className="text-lg font-bold text-yellow-300">210-1234567</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-900/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Droplets className="w-5 h-5 text-cyan-400" />
                  <span className="text-white">Υδραυλικός</span>
                </div>
                <span className="text-lg font-bold text-cyan-300">210-2345678</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-900/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-green-400" />
                  <span className="text-white">Διαχείριση</span>
                </div>
                <span className="text-lg font-bold text-green-300">{buildingInfo?.management_office_phone || '210-5566368'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-900/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span className="text-white">Εσωτ. Διαχειριστής</span>
                </div>
                <span className="text-lg font-bold text-purple-300">{buildingInfo?.internal_manager_phone || '697-1234567'}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    }];
  };

  // Helper function to create projects slides
  const createProjectsSlides = () => {
    if (!projectsInfo) return [];

    return [{
      id: 'projects-overview',
      title: 'Προσφορές & Έργα',
      icon: FileText,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <div className="bg-gradient-to-br from-teal-900/40 to-cyan-900/40 backdrop-blur-sm p-6 rounded-xl border border-teal-500/30 shadow-lg">
            <div className="flex items-center space-x-4 mb-4">
              <FileText className="w-8 h-8 text-teal-300" />
              <h3 className="text-xl font-semibold text-white">Κατάσταση Έργων</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-teal-100">Ενεργά Έργα</span>
                <span className="text-white font-bold text-lg">{projectsInfo.active_projects}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-teal-100">Εκκρεμείς Προσφορές</span>
                <span className="text-yellow-300 font-bold">{projectsInfo.pending_offers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-teal-100">Ενεργά Συμβόλαια</span>
                <span className="text-green-300 font-bold">{projectsInfo.active_contracts}</span>
              </div>
              <div className="pt-2 border-t border-teal-500/30">
                <div className="text-center py-2">
                  <div className="text-sm text-teal-100 mb-1">Πρόσφατα Έργα</div>
                  <div className="space-y-2 text-xs">
                    <div className="bg-teal-900/30 p-2 rounded">
                      <div className="text-teal-300 font-bold">Ανακαίνιση Κοινοχρήστων</div>
                      <div className="text-teal-100">75% Ολοκληρωμένο</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 backdrop-blur-sm p-6 rounded-xl border border-indigo-500/30 shadow-lg">
            <div className="flex items-center space-x-4 mb-4">
              <TrendingUp className="w-8 h-8 text-indigo-300" />
              <h3 className="text-xl font-semibold text-white">Οικονομική Επισκόπηση</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-indigo-100">Συνολικός Προϋπολογισμός</span>
                <span className="text-white font-bold">€{projectsInfo.total_budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-100">Συνολικά Έξοδα</span>
                <span className="text-red-300 font-bold">€{projectsInfo.total_spent.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-indigo-500/30">
                <div className="text-center py-2">
                  <div className="text-sm text-indigo-100 mb-1">Ποσοστό Χρήσης</div>
                  <div className="w-full bg-indigo-900/50 rounded-full h-2 mt-1">
                    <div 
                      className="bg-indigo-400 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.round((projectsInfo.total_spent / projectsInfo.total_budget) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-indigo-100 mt-1">
                    Διαθέσιμο: €{(projectsInfo.total_budget - projectsInfo.total_spent).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    }];
  };

  // Create slides with smart ordering:
  // 1. Dashboard overview (if data exists)
  // 2. Building statistics (always show)
  // 3. Emergency contacts (always show)
  // 4. Important announcements
  // 5. Active votes
  // 6. Detailed financial/maintenance/projects (if relevant)
  const slides = [
    ...createDashboardOverviewSlide(),
    ...createBuildingStatisticsSlide(),
    ...createEmergencyContactsSlide(),
    ...createAnnouncementSlides(),
    ...createVoteSlides(),
    ...(financialInfo && maintenanceInfo ? [
      ...createFinancialSlides(),
      ...createMaintenanceSlides(),
    ] : []),
    ...(projectsInfo ? createProjectsSlides() : []),
  ];

  return (
    <div className="h-screen w-screen text-white flex flex-col overflow-hidden font-ubuntu bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 max-w-full max-h-full">
      {/* Building Selector Modal */}
      <BuildingSelector
        isOpen={showBuildingSelector}
        onClose={() => setShowBuildingSelector(false)}
        onBuildingSelect={handleBuildingSelect}
        selectedBuilding={buildingInfo ? { id: buildingInfo.id, name: buildingInfo.name || '', address: buildingInfo.address || '' } as BuildingType : null}
        currentBuilding={buildingInfo ? { id: buildingInfo.id, name: buildingInfo.name || '', address: buildingInfo.address || '' } as BuildingType : null}
      />

      {/* Building Info Bar - Fixed height for TV */}
      <div className="bg-black bg-opacity-30 p-2 sm:p-3 flex-shrink-0 min-h-0">
        <div className="flex items-center justify-center max-w-full overflow-hidden">
          {/* Left Side - Building Info */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 overflow-hidden">
            <Building className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-blue-300" />
            <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm min-w-0 overflow-hidden">
              <div className="flex items-center space-x-1 min-w-0 overflow-hidden">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-blue-300" />
                <span className="truncate font-medium text-white">{buildingInfo?.address || 'Όλα τα κτίρια'}</span>
                {isLoading && (
                  <div className="flex items-center space-x-1 ml-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-300"></div>
                    <span className="text-xs text-blue-300">Φόρτωση...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Separator */}
          <div className="w-px h-8 bg-white bg-opacity-20 mx-4 flex-shrink-0"></div>
          
          {/* Center - Company Info */}
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
          
          {/* Separator */}
          <div className="w-px h-8 bg-white bg-opacity-20 mx-4 flex-shrink-0"></div>
          
          {/* Right Side - Data Status */}
          <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0 overflow-hidden">
            <div className="text-right flex-shrink-0">
              {/* Data Status Indicator */}
              <div>
                <DataStatusIndicator
                  isFetching={isFetching}
                  isError={isError}
                  lastUpdated={generalInfo?.last_updated}
                  className="text-xs opacity-75"
                />
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Main Content - Flexible height */}
      <div className="flex-1 p-2 sm:p-3 lg:p-6 overflow-hidden min-h-0 bg-gradient-to-br from-slate-900/50 via-blue-900/30 to-indigo-900/50 backdrop-blur-sm">
        <div ref={sliderRef} className="h-full overflow-hidden">
          <div
            ref={sliderContainerRef}
            className="keen-slider h-full overflow-hidden"
          >
            {slides.map((slide, index) => (
              <div key={slide.id} className="keen-slider__slide overflow-hidden">
                <div className="h-full flex flex-col overflow-hidden">
                  {/* Slide Header - Fixed height */}
                  <div className="flex items-center mb-3 sm:mb-4 lg:mb-6 flex-shrink-0 overflow-hidden">
                    <div className="flex items-center space-x-2 sm:space-x-2 lg:space-x-3 overflow-hidden">
                      <slide.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-300 flex-shrink-0" />
                      <h2 className="text-base sm:text-lg lg:text-2xl font-bold truncate text-white">{slide.title}</h2>
                    </div>
                  </div>

                  {/* Slide Content - Flexible height with proper scrolling */}
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

      {/* Navigation Dots - Fixed height */}
      <div className="bg-black bg-opacity-30 p-2 sm:p-3 flex-shrink-0 min-h-0">
        <div className="flex justify-center space-x-1.5 sm:space-x-2 lg:space-x-3 overflow-hidden">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => instanceRef.current?.moveToIdx(index)}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-3 lg:h-3 rounded-full transition-colors duration-200 flex-shrink-0 ${
                currentSlide === index
                  ? 'bg-white'
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
            />
          ))}
        </div>
      </div>

      {/* News Ticker - Bottom of screen */}
      {newsTicker && (
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 bg-opacity-95 p-2 sm:p-3 overflow-hidden flex-shrink-0 min-h-0 border-t-2 border-white border-opacity-20 relative">
          {/* NEWS title container with different shade */}
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 border border-blue-600 px-3 py-2 rounded-lg shadow-lg">
              <div className="text-sm font-bold text-white uppercase tracking-wide">
                NEWS
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 animate-marquee flex-1 ml-20">
              <span 
                className="whitespace-nowrap text-white text-sm sm:text-base font-medium"
                style={{ opacity: newsOpacity, transition: 'opacity 0.5s ease-in-out' }}
              >
                {newsTicker}
              </span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
              {newsItems.length > 1 && (
                <div className="flex items-center space-x-1">
                  <span className="text-white text-xs opacity-75">
                    {currentNewsIndex + 1} / {newsItems.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for marquee animation and slide transitions */}
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

        /* Smooth slide transitions */
        .keen-slider__slide {
          opacity: 0;
          transform: scale(0.98);
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
        }

        .keen-slider__slide[aria-hidden="false"] {
          opacity: 1;
          transform: scale(1);
        }

        /* Fade effect for slide content */
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