'use client';

import { useState, useEffect } from 'react';
import AnnouncementsWidget from '@/components/kiosk/widgets/AnnouncementsWidget';
import WeatherWidget from '@/components/kiosk/widgets/WeatherWidget';
import QRCodeWidget from '@/components/kiosk/widgets/QRCodeWidget';
import ManagerWidget from '@/components/kiosk/widgets/ManagerWidget';
import ManagementOfficeWidget from '@/components/kiosk/widgets/ManagementOfficeWidget';
import CommonExpenseBillWidget from '@/components/kiosk/widgets/CommonExpenseBillWidget';

interface FinancialSceneCustomProps {
  data?: any;
  buildingId?: number | null;
}

export default function FinancialSceneCustom({ data, buildingId }: FinancialSceneCustomProps) {
  const [currentSidebarWidget, setCurrentSidebarWidget] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  
  // Sidebar widgets that will auto-scroll with slide animation
  const sidebarWidgets = [
    { id: 'weather', name: 'Καιρός', Component: WeatherWidget },
    { id: 'qr', name: 'QR Code', Component: QRCodeWidget },
    { id: 'emergency', name: 'Επικοινωνία', Component: ManagerWidget },
  ];

  // Auto-scroll sidebar widgets every 10 seconds with smooth slide animation
  useEffect(() => {
    console.log('[FinancialScene] Setting up auto-scroll animation...');
    
    const interval = setInterval(() => {
      // Start smooth slide animation
      setIsSliding(true);
      console.log('[FinancialScene] Starting slide animation...');
      
      // After animation completes, change widget
      setTimeout(() => {
        setCurrentSidebarWidget((prev) => {
          const next = (prev + 1) % sidebarWidgets.length;
          console.log(`[FinancialScene] Widget change: ${prev} → ${next} (${sidebarWidgets[next].name})`);
          return next;
        });
        setIsSliding(false);
      }, 1500); // 1.5s smooth animation for continuous feel
    }, 10000); // 10 seconds per widget

    return () => {
      console.log('[FinancialScene] Cleaning up auto-scroll...');
      clearInterval(interval);
    };
  }, [sidebarWidgets.length]);

  const CurrentSidebarComponent = sidebarWidgets[currentSidebarWidget].Component;

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col overflow-hidden">
      {/* Top Bar - Management Office Info */}
      <div className="h-[12%] bg-slate-800/90 backdrop-blur-md border-b border-blue-500/20 shadow-lg">
        <div className="h-full">
          <ManagementOfficeWidget data={data} isLoading={false} error={undefined} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - 20% */}
        <div className="w-[20%] flex flex-col space-y-3 p-3">
          {/* Sticky Top - Announcements */}
          <div className="flex-shrink-0 h-[35%] bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-blue-500/20">
            <div className="h-full overflow-y-auto p-3">
              <AnnouncementsWidget data={data} isLoading={false} error={undefined} />
            </div>
          </div>

        {/* Auto-Scrolling Widgets Area - Slide Animation */}
        <div className="flex-1 bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden relative border border-blue-500/20">
          {/* Widget Indicators - Film Strip Style */}
          <div className="absolute top-3 right-3 z-10 flex space-x-1.5">
            {sidebarWidgets.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === currentSidebarWidget 
                    ? 'w-8 bg-blue-400 shadow-lg shadow-blue-500/50' 
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

        {/* Right Area - 80% - Common Expenses Sheet ONLY (No Headers) */}
        <div className="flex-1 p-3">
          {/* Clean container with blue theme - NO HEADER */}
          <div className="h-full w-full bg-slate-800/80 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-blue-500/30">
            {/* Bill Image - FULL Container, No Header */}
            <div className="h-full w-full">
              <CommonExpenseBillWidget data={data} isLoading={false} error={undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

