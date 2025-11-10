'use client';

import { useState, useEffect, useRef } from 'react';
import WeatherWidget from '@/components/kiosk/widgets/WeatherWidget';
import QRCodeWidget from '@/components/kiosk/widgets/QRCodeWidget';
import ManagerWidget from '@/components/kiosk/widgets/ManagerWidget';
import AssemblyAnnouncementWidget from '@/components/kiosk/widgets/AssemblyAnnouncementWidget';
import EmergencyWidget from '@/components/kiosk/widgets/EmergencyWidget';
import ApartmentDebtsWidget from '@/components/kiosk/widgets/ApartmentDebtsWidget';
import AnnouncementsVotesCarousel from '@/components/kiosk/widgets/AnnouncementsVotesCarousel';
import NewsWidget from '@/components/kiosk/widgets/NewsWidget';
import BuildingSelector from '@/components/BuildingSelector';
import type { Building } from '@/lib/api';

interface MorningOverviewSceneCustomProps {
  data?: any;
  buildingId?: number | null;
  onBuildingChange?: (buildingId: number | null) => void;
}

export default function MorningOverviewSceneCustom({ data, buildingId, onBuildingChange }: MorningOverviewSceneCustomProps) {
  const [currentSidebarWidget, setCurrentSidebarWidget] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);
  const announcementsScrollRef = useRef<HTMLDivElement>(null);
  
  // Sidebar widgets that will auto-scroll with slide animation
  const sidebarWidgets = [
    { id: 'qr', name: 'QR Code', Component: QRCodeWidget },
    { id: 'emergency', name: 'Επικοινωνία', Component: ManagerWidget },
    { id: 'emergency-contacts', name: 'Τηλέφωνα Έκτακτης Ανάγκης', Component: EmergencyWidget },
  ];

  // Auto-scroll sidebar widgets every 10 seconds with smooth slide animation
  useEffect(() => {
    console.log('[MorningOverviewScene] Setting up auto-scroll animation...');
    
    const interval = setInterval(() => {
      console.log('[MorningOverviewScene] Starting slide animation...');
      setIsTransitioning(true);
      
      // After animation completes, change widget
      setTimeout(() => {
        setCurrentSidebarWidget((prev) => {
          const next = (prev + 1) % sidebarWidgets.length;
          console.log(`[MorningOverviewScene] Widget change: ${prev} → ${next} (${sidebarWidgets[next].name})`);
          return next;
        });
        setIsTransitioning(false);
      }, 1500); // 1.5s smooth animation for continuous feel
    }, 10000); // 10 seconds per widget

    return () => {
      console.log('[MorningOverviewScene] Cleaning up auto-scroll...');
      clearInterval(interval);
    };
  }, [sidebarWidgets.length]);

  // Auto-scroll for announcements widget
  useEffect(() => {
    const scrollContainer = announcementsScrollRef.current;
    if (!scrollContainer) return;

    let isPaused = false;
    let pauseTimeout: NodeJS.Timeout | null = null;

    const checkAndScroll = () => {
      if (isPaused) return;

      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      if (maxScroll <= 0) return; // No scrolling needed

      const currentPosition = scrollContainer.scrollTop;
      
      // If at bottom, pause and reset to top
      if (currentPosition >= maxScroll - 2) {
        isPaused = true;
        pauseTimeout = setTimeout(() => {
          scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
          // Wait for scroll to complete before resuming
          setTimeout(() => {
            isPaused = false;
          }, 1000);
        }, 3000); // Pause 3 seconds at bottom
        return;
      }

      // Smooth scroll down (0.5px per frame = ~30px per second)
      scrollContainer.scrollTop = currentPosition + 0.5;
    };

    const scrollInterval = setInterval(checkAndScroll, 16); // ~60fps

    return () => {
      clearInterval(scrollInterval);
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };
  }, []);

  // Keyboard shortcut for building selector (Ctrl+Alt+B, b, β, Β)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && (event.key === 'b' || event.key === 'B' || event.key === 'β' || event.key === 'Β')) {
        event.preventDefault();
        setShowBuildingSelector(true);
        console.log('[MorningOverviewScene] Building selector opened via keyboard shortcut');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle building selection
  const handleBuildingSelect = (building: Building | null) => {
    if (building === null) {
      onBuildingChange?.(null);
    } else {
      onBuildingChange?.(building.id);
    }
    setShowBuildingSelector(false);
  };

  const CurrentSidebarComponent = sidebarWidgets[currentSidebarWidget].Component;

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-950 via-purple-950/80 via-indigo-950/60 to-slate-950 flex flex-col overflow-hidden relative">
      {/* Building Selector Modal */}
      <BuildingSelector
        isOpen={showBuildingSelector}
        onClose={() => setShowBuildingSelector(false)}
        onBuildingSelect={handleBuildingSelect}
        selectedBuilding={data?.building_info ? { 
          id: data.building_info.id, 
          name: data.building_info.name || '', 
          address: data.building_info.address || '',
          city: data.building_info.city || '',
          created_at: data.building_info.created_at || new Date().toISOString()
        } as Building : null}
        currentBuilding={data?.building_info ? { 
          id: data.building_info.id, 
          name: data.building_info.name || '', 
          address: data.building_info.address || '',
          city: data.building_info.city || '',
          created_at: data.building_info.created_at || new Date().toISOString()
        } as Building : null}
      />
      {/* Animated background overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 animate-pulse" style={{ animationDuration: '8s' }} />
      
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Main Content Area - Flex container */}
      <div className="flex-1 flex overflow-hidden pb-4 relative z-10">
        {/* Left Sidebar - 25% */}
        <div className="w-[25%] flex flex-col space-y-4 p-4">
        {/* Sticky Top - Important Announcements (Assembly/Votes) */}
        <div className="flex-shrink-0 h-[35%] relative">
          <div className="relative h-full bg-gradient-to-br from-slate-800/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-purple-500/30 transition-all duration-300">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            
            <div 
              ref={announcementsScrollRef}
              className="h-full overflow-y-auto p-4 custom-scrollbar scroll-smooth"
              style={{ scrollBehavior: 'smooth' }}
            >
              <AssemblyAnnouncementWidget data={data} isLoading={false} error={undefined} />
            </div>
          </div>
        </div>

        {/* Auto-Scrolling Widgets Area - Enhanced Slide Animation */}
        <div className="flex-1 relative">
          <div className="relative h-full bg-gradient-to-br from-slate-800/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-purple-500/30 transition-all duration-300">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            
            {/* Widget Indicators - Enhanced Film Strip Style */}
            <div className="absolute top-4 right-4 z-20 flex space-x-2 bg-slate-900/60 backdrop-blur-sm px-3 py-2 rounded-full border border-purple-500/20">
              {sidebarWidgets.map((_, index) => (
                <div
                  key={index}
                  className={`h-2.5 rounded-full transition-all duration-700 ease-out ${
                    index === currentSidebarWidget 
                      ? 'w-10 bg-gradient-to-r from-purple-400 to-indigo-400 shadow-lg shadow-purple-500/50 scale-110' 
                      : 'w-2.5 bg-slate-500/60'
                  }`}
                />
              ))}
            </div>

            {/* Sliding Widget Container - Enhanced Smooth Film Strip Animation */}
            <div className="h-full w-full relative overflow-hidden">
              {sidebarWidgets.map((widget, index) => {
                const WidgetComp = widget.Component;
                const isActive = index === currentSidebarWidget;
                return (
                  <div
                    key={widget.id}
                    className="absolute inset-0"
                    style={{
                      transform: `translateY(${(index - currentSidebarWidget) * 100}%)`,
                      transition: 'transform 1500ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 1500ms ease-in-out',
                      opacity: isActive ? 1 : 0.3,
                      willChange: 'transform, opacity',
                    }}
                  >
                    <div className="h-full w-full p-5">
                      <div className={`h-full w-full transition-all duration-700 ${isActive ? 'scale-100' : 'scale-95'}`}>
                        <WidgetComp data={data} isLoading={false} error={undefined} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>

        {/* Center Area - 55% with stacked widgets */}
        <div className="w-[55%] flex flex-col space-y-4 p-4">
          {/* Weather Widget - Primary focus */}
          <div className="h-[60%] relative">
            <div className="relative h-full bg-gradient-to-br from-slate-800/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-purple-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
              <div className="h-full p-5">
                <WeatherWidget data={data} isLoading={false} error={undefined} />
              </div>
            </div>
          </div>

          {/* Announcements & Votes Carousel - Bottom */}
          <div className="h-[40%] relative">
            <div className="relative h-full bg-gradient-to-br from-slate-800/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-blue-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
              <div className="h-full p-5">
                <AnnouncementsVotesCarousel data={data} isLoading={false} error={undefined} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Area - 20% - Common Expenses Summary Widget */}
        <div className="w-[20%] p-4">
        <div className="h-full relative">
          <div className="relative h-full w-full bg-gradient-to-br from-indigo-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-indigo-500/40 transition-all duration-300">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="h-full w-full p-5 relative z-10">
              <ApartmentDebtsWidget data={data} isLoading={false} error={undefined} buildingId={buildingId} />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* News Ticker - Bottom with minimal spacing */}
      <div className="h-16 bg-gradient-to-r from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border-t border-green-500/30 shadow-2xl relative z-10">
        <div className="h-full px-6 flex items-center overflow-hidden">
          <NewsWidget data={data} isLoading={false} error={undefined} />
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(139, 92, 246, 0.5), rgba(99, 102, 241, 0.5));
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
