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
          <div className="text-center text-gray-300 py-8">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
                className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start space-x-4 h-full">
                  <div className="flex-shrink-0">
                    <Bell className="w-8 h-8 text-blue-300" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-xl font-semibold mb-3 text-white">
                      {announcement.title}
                    </h3>
                    <p className="text-sm opacity-90 mb-4 leading-relaxed flex-1 text-blue-100">
                      {announcement.content}
                    </p>
                    <div className="flex items-center text-xs opacity-75 mt-auto">
                      <Calendar className="w-4 h-4 mr-1 text-blue-300" />
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

  // Create slides with priority: announcements first, then votes, then requests, then other content
  const slides = [
    ...createAnnouncementSlides(),
    ...createVoteSlides(),
    ...createRequestSlides(),
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

      {/* Custom CSS for marquee animation */}
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
      `}</style>
    </div>
  );
} 