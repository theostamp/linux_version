'use client';

import { useState, useEffect } from 'react';
import WeatherWidget from '@/components/kiosk/widgets/WeatherWidget';
import QRCodeWidget from '@/components/kiosk/widgets/QRCodeWidget';
import AnnouncementsWidget from '@/components/kiosk/widgets/AnnouncementsWidget';
import AssemblyAnnouncementWidget from '@/components/kiosk/widgets/AssemblyAnnouncementWidget';
import EmergencyWidget from '@/components/kiosk/widgets/EmergencyWidget';
import ApartmentDebtsWidget from '@/components/kiosk/widgets/ApartmentDebtsWidget';
import AnnouncementsExpensesSlider from '@/components/kiosk/widgets/AnnouncementsExpensesSlider';
import ManagementOfficeWidget from '@/components/kiosk/widgets/ManagementOfficeWidget';
import NewsWidget from '@/components/kiosk/widgets/NewsWidget';
import { Building2 } from 'lucide-react';

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

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex overflow-hidden pb-20 gap-2">
      {/* Left Sidebar - 23% */}
      <div className="w-[23%] flex flex-col space-y-3.5 p-3">
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
                    <WidgetComp data={data} isLoading={false} error={undefined} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center Area - 54% with stacked widgets */}
      <div className="w-[54%] flex flex-col space-y-3.5 p-3">
        {/* Management Office Widget - Top */}
        <div className="h-[15%] bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-blue-500/20">
          <div className="h-full">
            <ManagementOfficeWidget data={data} isLoading={false} error={undefined} />
          </div>
        </div>

        {/* Weather Widget - Middle (compact, with forecast) */}
        <div className="h-[43%] bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-purple-500/20">
          <div className="h-full p-4">
            <WeatherWidget data={data} isLoading={false} error={undefined} />
          </div>
        </div>

        {/* Announcements, Expenses & Heating Chart Slider - Bottom */}
        <div className="h-[24%] bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-blue-500/20">
          <div className="h-full p-4">
            <AnnouncementsExpensesSlider data={data} isLoading={false} error={undefined} buildingId={buildingId} />
          </div>
        </div>

      </div>

      {/* Right Area - 23% - Common Expenses Summary Widget (Compact) */}
      <div className="w-[23%] p-3 flex flex-col space-y-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-indigo-200/80">Οφειλές</p>
            <p className="text-sm font-semibold text-white">Υπόλοιπα ανά διαμέρισμα</p>
          </div>
          <div className="flex items-center text-[11px] text-indigo-200/70">
            <Building2 className="w-3.5 h-3.5 mr-1" />
            {data?.building_info?.name || 'Κτίριο'}
          </div>
        </div>
        <div className="flex-1 w-full backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-indigo-500/30" style={{ backgroundColor: '#222D59' }}>
          <div className="h-full w-full p-4">
            <ApartmentDebtsWidget data={data} isLoading={false} error={undefined} />
          </div>
        </div>
      </div>

      {/* News Widget - Fixed to bottom with breathing room */}
      <div className="fixed bottom-4 left-5 right-5 h-14 bg-slate-900/90 backdrop-blur-xl border border-emerald-500/20 shadow-2xl shadow-emerald-900/40 rounded-xl z-50">
        <div className="h-full px-5">
          <NewsWidget data={data} isLoading={false} error={undefined} />
        </div>
      </div>

      {/* Copyright Footer - Discrete text below News Widget */}
      <div className="fixed bottom-0 left-0 right-0 h-4 flex items-center justify-center z-40">
        <p className="text-[9px] text-slate-500/50 font-light tracking-wider">
          © {new Date().getFullYear()} New Concierge. All rights reserved.
        </p>
      </div>
    </div>
  );
}
