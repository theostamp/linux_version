'use client';

import { useEffect, useState, useRef } from 'react';
import { useKeenSlider } from 'keen-slider/react';
import { Bell, Calendar, Clock, MapPin, Users, Vote, AlertTriangle, Building, ExternalLink, Settings } from 'lucide-react';
import { Announcement, Vote as VoteType, Building as BuildingType } from '@/lib/api';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/utils';
import BuildingSelector from './BuildingSelector';

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
}

export default function KioskMode({
  announcements,
  votes,
  buildingInfo,
  advertisingBanners = [],
  generalInfo
}: KioskModeProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newsTicker, setNewsTicker] = useState<string>('');
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);
  const [currentBuildingId, setCurrentBuildingId] = useState<number | undefined>(
    buildingInfo?.id
  );
  
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
      setCurrentBuildingId(undefined);
      
      // Remove building parameter from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('building');
      window.location.href = url.toString();
    } else {
      // Handle specific building selection
      const buildingId = typeof building === 'number' ? building : building.id;
      setCurrentBuildingId(buildingId);
      
      // Reload the page with the new building ID
      const url = new URL(window.location.href);
      url.searchParams.set('building', buildingId.toString());
      window.location.href = url.toString();
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
          
          <div className="grid grid-cols-2 gap-4">
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
                <p className="text-sm text-green-200 mb-1">Διαχειριστής</p>
                <p className="text-sm font-semibold text-white">
                  {buildingInfo.internal_manager_name}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-300 py-8">
          <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Δεν υπάρχουν πληροφορίες κτιρίου</p>
        </div>
      ),
    },
    // Slide 4: Advertising Banners
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
    <div className="h-screen w-screen text-white flex flex-col overflow-hidden font-ubuntu">
      {/* Building Selector Modal */}
      <BuildingSelector
        isOpen={showBuildingSelector}
        onClose={() => setShowBuildingSelector(false)}
        onBuildingSelect={handleBuildingSelect}
        selectedBuilding={currentBuildingId ? { id: currentBuildingId, name: buildingInfo?.name || '', address: buildingInfo?.address || '' } as BuildingType : null}
      />

      {/* Building Info Bar - Fixed height for TV */}
      <div className="bg-black bg-opacity-30 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Building className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">
                {buildingInfo?.name || 'Πολυκατοικία'}
              </h1>
              <p className="text-sm opacity-75">
                {buildingInfo?.address || 'Πληροφορίες Κτιρίου'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-mono">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-sm opacity-75">
              {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: el })}
            </div>
          </div>
        </div>
      </div>

      {/* News Ticker - Fixed height */}
      {newsTicker && (
        <div className="bg-yellow-600 bg-opacity-90 p-2 overflow-hidden flex-shrink-0">
          <div className="flex items-center space-x-2 animate-marquee">
            <span className="font-semibold text-sm">📢</span>
            <span className="whitespace-nowrap text-sm">{newsTicker}</span>
          </div>
        </div>
      )}

      {/* Main Content - Flexible height */}
      <div className="flex-1 p-6 overflow-hidden">
        <div ref={sliderRef} className="h-full">
          <div
            ref={sliderContainerRef}
            className="keen-slider h-full"
          >
            {slides.map((slide, index) => (
              <div key={slide.id} className="keen-slider__slide">
                <div className="h-full flex flex-col">
                  {/* Slide Header - Fixed height */}
                  <div className="flex items-center mb-6 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <slide.icon className="w-8 h-8 text-blue-300" />
                      <h2 className="text-2xl font-bold">{slide.title}</h2>
                    </div>
                  </div>

                  {/* Slide Content - Flexible height with proper scrolling */}
                  <div className="flex-1 overflow-y-auto pr-4 pb-4">
                    <div className="h-full">
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
      <div className="bg-black bg-opacity-30 p-4 flex-shrink-0">
        <div className="flex justify-center space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => instanceRef.current?.moveToIdx(index)}
              className={`w-3 h-3 rounded-full transition-colors duration-200 ${
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