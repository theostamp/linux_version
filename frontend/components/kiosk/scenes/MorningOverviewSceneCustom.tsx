'use client';

import { useState, useEffect } from 'react';
import WeatherWidget from '@/components/kiosk/widgets/WeatherWidget';
import QRCodeWidget from '@/components/kiosk/widgets/QRCodeWidget';
import AnnouncementsWidget from '@/components/kiosk/widgets/AnnouncementsWidget';
import AssemblyAnnouncementWidget from '@/components/kiosk/widgets/AssemblyAnnouncementWidget';
import EmergencyWidget from '@/components/kiosk/widgets/EmergencyWidget';
import ApartmentDebtsWidget from '@/components/kiosk/widgets/ApartmentDebtsWidget';
import AnnouncementsVotesCarousel from '@/components/kiosk/widgets/AnnouncementsVotesCarousel';
import ManagementOfficeWidget from '@/components/kiosk/widgets/ManagementOfficeWidget';
import NewsWidget from '@/components/kiosk/widgets/NewsWidget';

interface MorningOverviewSceneCustomProps {
  data?: any;
  buildingId?: number | null;
}

export default function MorningOverviewSceneCustom({ data, buildingId }: MorningOverviewSceneCustomProps) {
  const [currentSidebarWidget, setCurrentSidebarWidget] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  
  // Sidebar widgets that will auto-scroll with slide animation
  const sidebarWidgets = [
    { id: 'qr', name: 'QR Code', Component: QRCodeWidget },
    { id: 'emergency-contacts', name: 'Τηλέφωνα Έκτακτης Ανάγκης', Component: EmergencyWidget },
  ];

  // Auto-scroll sidebar widgets every 10 seconds with smooth slide animation
  useEffect(() => {
    console.log('[MorningOverviewScene] Setting up auto-scroll animation...');
    
    const interval = setInterval(() => {
      // Start smooth slide animation
      setIsSliding(true);
      console.log('[MorningOverviewScene] Starting slide animation...');
      
      // After animation completes, change widget
      setTimeout(() => {
        setCurrentSidebarWidget((prev) => {
          const next = (prev + 1) % sidebarWidgets.length;
          console.log(`[MorningOverviewScene] Widget change: ${prev} → ${next} (${sidebarWidgets[next].name})`);
          return next;
        });
        setIsSliding(false);
      }, 1500); // 1.5s smooth animation for continuous feel
    }, 10000); // 10 seconds per widget

    return () => {
      console.log('[MorningOverviewScene] Cleaning up auto-scroll...');
      clearInterval(interval);
    };
  }, [sidebarWidgets.length]);

  const CurrentSidebarComponent = sidebarWidgets[currentSidebarWidget].Component;

  // Filter announcements for General Assembly or Votes
  const importantAnnouncements = (data?.announcements || []).filter((ann: any) => 
    ann.title?.toLowerCase().includes('συνέλευση') || 
    ann.title?.toLowerCase().includes('σύγκληση') ||
    ann.title?.toLowerCase().includes('ψηφοφορ')
  );

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex overflow-hidden pb-16">
      {/* Left Sidebar - 23% */}
      <div className="w-[23%] flex flex-col space-y-3 p-3">
        {/* Sticky Top - Important Announcements (Assembly/Votes) with Custom Format */}
        <div className="flex-shrink-0 h-[35%] bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-purple-500/20">
          <div className="h-full overflow-y-auto p-3">
            <AssemblyAnnouncementWidget data={data} isLoading={false} error={null} />
          </div>
        </div>

        {/* Auto-Scrolling Widgets Area - Slide Animation */}
        <div className="flex-1 bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden relative border border-purple-500/20">
          {/* Widget Indicators - Film Strip Style */}
          <div className="absolute top-3 right-3 z-10 flex space-x-1.5">
            {sidebarWidgets.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === currentSidebarWidget 
                    ? 'w-8 bg-purple-400 shadow-lg shadow-purple-500/50' 
                    : 'w-2 bg-slate-600/50'
                }`}
              />
            ))}
          </div>

          {/* Sliding Widget Container - Smooth Film Strip Animation */}
          <div className="h-full w-full relative overflow-hidden">
            {sidebarWidgets.map((widget, index) => {
              const WidgetComp = widget.Component;
              return (
                <div
                  key={widget.id}
                  className="absolute inset-0"
                  style={{
                    transform: `translateY(${(index - currentSidebarWidget) * 100}%)`,
                    transition: 'transform 1500ms cubic-bezier(0.4, 0.0, 0.2, 1)',
                    willChange: 'transform', // Performance hint for browser
                  }}
                >
                  <div className="h-full w-full p-4">
                    <WidgetComp data={data} isLoading={false} error={null} buildingId={buildingId} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center Area - 54% with stacked widgets */}
      <div className="w-[54%] flex flex-col space-y-3 p-3">
        {/* Management Office Widget - Top */}
        <div className="h-[15%] bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-blue-500/20">
          <div className="h-full">
            <ManagementOfficeWidget data={data} isLoading={false} error={null} />
          </div>
        </div>

        {/* Weather Widget - Middle (Reduced height) */}
        <div className="h-[35%] bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-purple-500/20">
          <div className="h-full p-4">
            <WeatherWidget data={data} isLoading={false} error={null} buildingId={buildingId} />
          </div>
        </div>

        {/* Announcements & Votes Carousel - Bottom (Increased height for two items) */}
        <div className="h-[30%] bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-blue-500/20">
          <div className="h-full p-4">
            <AnnouncementsVotesCarousel data={data} isLoading={false} error={null} />
          </div>
        </div>

      </div>

      {/* Right Area - 23% - Common Expenses Summary Widget (Compact) */}
      <div className="w-[23%] p-3">
        <div className="h-full w-full backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-indigo-500/30" style={{ backgroundColor: '#222D59' }}>
          <div className="h-full w-full p-4">
            <ApartmentDebtsWidget data={data} isLoading={false} error={null} buildingId={buildingId} />
          </div>
        </div>
      </div>

      {/* News Widget - Fixed to bottom of screen with spacing */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-slate-800/95 backdrop-blur-md border-t border-green-500/20 z-50 mb-2">
        <div className="h-full px-4">
          <NewsWidget data={data} isLoading={false} error={null} />
        </div>
      </div>
    </div>
  );
}

