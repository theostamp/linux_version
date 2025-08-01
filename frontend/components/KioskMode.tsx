'use client';

import { useEffect, useState, useRef } from 'react';
import { useKeenSlider } from 'keen-slider/react';
import { Bell, Calendar, Clock, MapPin, Users, Vote, AlertTriangle, Building, ExternalLink, Settings, Phone } from 'lucide-react';
import { Announcement, Vote as VoteType, Building as BuildingType } from '@/lib/api';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/utils';
import BuildingSelector from './BuildingSelector';
import DataStatusIndicator from './DataStatusIndicator';

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
  onBuildingChange,
  isLoading = false,
  isError = false,
  isFetching = false
}: KioskModeProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newsTicker, setNewsTicker] = useState<string>('');
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

  // Load news ticker
  useEffect(() => {
    async function loadNews() {
      try {
        const response = await fetch('/api/quote');
        if (response.ok) {
          const data = await response.json();
          setNewsTicker(data.content || 'Καλώς ήρθατε στην πολυκατοικία μας!');
        }
      } catch (error) {
        setNewsTicker('Καλώς ήρθατε στην πολυκατοικία μας!');
      }
    }
    loadNews();
  }, []);

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

  const slides = [
    // Slide 1: Announcements
    {
      id: 'announcements',
      title: 'Ανακοινώσεις',
      icon: Bell,
      content: announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white bg-opacity-10 backdrop-blur-sm p-6 rounded-lg border border-white border-opacity-20"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Bell className="w-6 h-6 text-blue-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-3">
                    {announcement.title}
                  </h3>
                  <p className="text-sm opacity-90 mb-3 leading-relaxed">
                    {announcement.content}
                  </p>
                  <div className="flex items-center text-xs opacity-75">
                    <Calendar className="w-4 h-4 mr-1" />
                    {safeFormatDate(announcement.created_at, 'dd/MM/yyyy HH:mm', { locale: el })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-300 py-8">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Δεν υπάρχουν ανακοινώσεις</p>
        </div>
      ),
    },
    // Slide 2: Votes
    {
      id: 'votes',
      title: 'Ψηφοφορίες',
      icon: Vote,
      content: votes.length > 0 ? (
        <div className="space-y-4">
          {votes.map((vote) => (
            <div
              key={vote.id}
              className="bg-white bg-opacity-10 backdrop-blur-sm p-6 rounded-lg border border-white border-opacity-20"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Vote className="w-6 h-6 text-green-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-3">
                    {vote.title}
                  </h3>
                  <p className="text-sm opacity-90 mb-3 leading-relaxed">
                    {vote.description}
                  </p>
                  <div className="flex items-center justify-between text-xs opacity-75">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Λήξη: {safeFormatDate(vote.end_date, 'dd/MM/yyyy', { locale: el })}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {vote.total_votes || 0} ψήφοι
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-300 py-8">
          <Vote className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Δεν υπάρχουν ενεργές ψηφοφορίες</p>
        </div>
      ),
    },
    // Slide 3: Building Information
    {
      id: 'building-info',
      title: 'Πληροφορίες Κτιρίου',
      icon: Building,
      content: buildingInfo ? (
        <div className="space-y-6">
          <div className="text-center">
            <Building className="w-16 h-16 mx-auto mb-4 text-blue-300" />
            <h2 className="text-2xl font-bold text-white mb-3">
              {buildingInfo.name}
            </h2>
            <p className="text-blue-200 mb-4 text-base">
              <MapPin className="w-4 h-4 inline mr-1" />
              {buildingInfo.address}
              {buildingInfo.city && `, ${buildingInfo.city}`}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm p-4 rounded-lg text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-300" />
              <p className="text-sm text-blue-200 mb-1">Διαμερίσματα</p>
              <p className="text-xl font-bold text-white">
                {buildingInfo.apartments_count || 'N/A'}
              </p>
            </div>
            
            {buildingInfo.internal_manager_name && (
              <div className="bg-white bg-opacity-10 backdrop-blur-sm p-4 rounded-lg text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-green-300" />
                <p className="text-sm text-green-200 mb-1">Εσωτερικός Διαχειριστής</p>
                <p className="text-sm font-semibold text-white">
                  {buildingInfo.internal_manager_name}
                </p>
                {buildingInfo.internal_manager_phone && (
                  <p className="text-xs text-green-200 mt-1">
                    <Phone className="w-3 h-3 inline mr-1" />
                    {buildingInfo.internal_manager_phone}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Management Office Information */}
          {(buildingInfo.management_office_name || buildingInfo.management_office_phone || buildingInfo.management_office_address) && (
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-lg">
              <div className="text-center mb-4">
                <Users className="w-8 h-8 mx-auto mb-2 text-white" />
                <h3 className="text-lg font-bold text-white">Εταιρεία Διαχείρισης</h3>
              </div>
              
              <div className="space-y-3">
                {buildingInfo.management_office_name && (
                  <div className="flex items-center justify-center space-x-2">
                    <Building className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">{buildingInfo.management_office_name}</span>
                  </div>
                )}
                
                {buildingInfo.management_office_phone && (
                  <div className="flex items-center justify-center space-x-2">
                    <Phone className="w-5 h-5 text-white" />
                    <span className="text-white">{buildingInfo.management_office_phone}</span>
                  </div>
                )}
                
                {buildingInfo.management_office_address && (
                  <div className="flex items-center justify-center space-x-2">
                    <MapPin className="w-5 h-5 text-white" />
                    <span className="text-white text-sm">{buildingInfo.management_office_address}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-300 py-8">
          <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Δεν υπάρχουν πληροφορίες κτιρίου</p>
        </div>
      ),
    },
    // Slide 4: Contact Information
    {
      id: 'contact-info',
      title: 'Στοιχεία Επικοινωνίας',
      icon: Phone,
      content: buildingInfo ? (
        <div className="space-y-6">
          {/* Management Office */}
          {(buildingInfo.management_office_name || buildingInfo.management_office_phone || buildingInfo.management_office_address) && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-lg">
              <div className="text-center mb-4">
                <Building className="w-10 h-10 mx-auto mb-2 text-white" />
                <h3 className="text-xl font-bold text-white">Εταιρεία Διαχείρισης</h3>
              </div>
              
              <div className="space-y-4">
                {buildingInfo.management_office_name && (
                  <div className="flex items-center justify-center space-x-3">
                    <Building className="w-6 h-6 text-white" />
                    <span className="text-white text-lg font-semibold">{buildingInfo.management_office_name}</span>
                  </div>
                )}
                
                {buildingInfo.management_office_phone && (
                  <div className="flex items-center justify-center space-x-3">
                    <Phone className="w-6 h-6 text-white" />
                    <span className="text-white text-lg">{buildingInfo.management_office_phone}</span>
                  </div>
                )}
                
                {buildingInfo.management_office_address && (
                  <div className="flex items-center justify-center space-x-3">
                    <MapPin className="w-6 h-6 text-white" />
                    <span className="text-white text-base">{buildingInfo.management_office_address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Manager */}
          {(buildingInfo.internal_manager_name || buildingInfo.internal_manager_phone) && (
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-lg">
              <div className="text-center mb-4">
                <Users className="w-10 h-10 mx-auto mb-2 text-white" />
                <h3 className="text-xl font-bold text-white">Εσωτερικός Διαχειριστής</h3>
              </div>
              
              <div className="space-y-4">
                {buildingInfo.internal_manager_name && (
                  <div className="flex items-center justify-center space-x-3">
                    <Users className="w-6 h-6 text-white" />
                    <span className="text-white text-lg font-semibold">{buildingInfo.internal_manager_name}</span>
                  </div>
                )}
                
                {buildingInfo.internal_manager_phone && (
                  <div className="flex items-center justify-center space-x-3">
                    <Phone className="w-6 h-6 text-white" />
                    <span className="text-white text-lg">{buildingInfo.internal_manager_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!buildingInfo.management_office_name && !buildingInfo.internal_manager_name && (
            <div className="text-center text-gray-300 py-8">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Δεν υπάρχουν διαθέσιμα στοιχεία επικοινωνίας</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-300 py-8">
          <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Δεν υπάρχουν πληροφορίες κτιρίου</p>
        </div>
      ),
    },
    // Slide 5: Advertising Banners
    {
      id: 'advertising',
      title: 'Χρήσιμες Υπηρεσίες',
      icon: ExternalLink,
      content: advertisingBanners.length > 0 ? (
        <div className="space-y-4">
          {advertisingBanners.map((banner) => (
            <div
              key={banner.id}
              className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-lg text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-3">
                    {banner.title}
                  </h3>
                  <p className="text-sm opacity-90 mb-3">
                    {banner.description}
                  </p>
                  <div className="flex items-center text-xs opacity-75">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Περισσότερες πληροφορίες
                  </div>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-300 py-8">
          <ExternalLink className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Δεν υπάρχουν διαθέσιμες υπηρεσίες</p>
        </div>
      ),
    },
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
        <div className="flex items-center justify-between max-w-full overflow-hidden">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 overflow-hidden">
            <Building className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm opacity-75 min-w-0 overflow-hidden">
              <div className="flex items-center space-x-1 min-w-0 overflow-hidden">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{buildingInfo?.address || 'Όλα τα κτίρια'}</span>
                {isLoading && (
                  <div className="flex items-center space-x-1 ml-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-300"></div>
                    <span className="text-xs text-blue-300">Φόρτωση...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0 overflow-hidden">
            {/* Management Office Info - Right Side */}
            {buildingInfo?.management_office_name && (
              <div className="flex items-center space-x-1 text-xs sm:text-sm opacity-75 hidden md:flex overflow-hidden">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate max-w-24 sm:max-w-32">{buildingInfo.management_office_name}</span>
              </div>
            )}
            {buildingInfo?.management_office_phone && (
              <div className="flex items-center space-x-1 text-xs sm:text-sm opacity-75 overflow-hidden">
                <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{buildingInfo.management_office_phone}</span>
              </div>
            )}
            
            {/* Time and Date - Right Side */}
            <div className="text-right flex-shrink-0">
              <div className="text-lg sm:text-xl lg:text-2xl font-mono">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-xs sm:text-sm opacity-75">
                {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: el })}
              </div>
              {/* Data Status Indicator */}
              <div className="mt-1">
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

      {/* News Ticker - Fixed height */}
      {newsTicker && (
        <div className="bg-yellow-600 bg-opacity-90 p-1 sm:p-2 overflow-hidden flex-shrink-0 min-h-0">
          <div className="flex items-center space-x-1 sm:space-x-2 animate-marquee">
            <span className="font-semibold text-xs sm:text-sm">📢</span>
            <span className="whitespace-nowrap text-xs sm:text-sm">{newsTicker}</span>
          </div>
        </div>
      )}

      {/* Main Content - Flexible height */}
      <div className="flex-1 p-2 sm:p-3 lg:p-6 overflow-hidden min-h-0">
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
                      <h2 className="text-base sm:text-lg lg:text-2xl font-bold truncate">{slide.title}</h2>
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

      {/* Custom CSS for marquee animation */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
} 