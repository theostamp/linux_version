// frontend/app/(dashboard)/kiosk/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, Clock, Eye, Maximize2, Minimize2 } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { KioskWidget } from '@/types/kiosk';
import { getSystemWidgets } from '@/lib/kiosk/widgets/registry';
import WidgetWrapper from '@/components/kiosk/widgets/base/WidgetWrapper';

export default function KioskDisplayPage() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const [widgets, setWidgets] = useState<KioskWidget[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Load enabled widgets
    const systemWidgets = getSystemWidgets(building?.id || 1);
    const mockCustomWidgets: KioskWidget[] = [
      {
        id: 'custom_news_feed',
        name: 'Neighborhood News',
        description: 'Local neighborhood news and updates',
        type: 'custom',
        category: 'main_slides',
        component: 'CustomNewsWidget',
        enabled: true,
        order: 10,
        settings: {
          title: 'Ειδήσεις Συνοικίας',
          showTitle: true,
          gridSize: 'medium',
          backgroundColor: '#f0f9ff',
        },
        dataSource: '/api/custom/news',
        refreshInterval: 900,
        createdAt: new Date('2025-09-20'),
        updatedAt: new Date('2025-09-25'),
        createdBy: 1,
      },
    ];
    const enabledWidgets = [...systemWidgets, ...mockCustomWidgets].filter(w => w.enabled);
    setWidgets(enabledWidgets);
  }, [building]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate main slides
  useEffect(() => {
    const mainSlides = widgets.filter(w => w.category === 'main_slides');
    if (mainSlides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % mainSlides.length);
    }, 10000); // 10 seconds per slide

    return () => clearInterval(interval);
  }, [widgets]);

  const mainSlides = widgets.filter(w => w.category === 'main_slides').sort((a, b) => a.order - b.order);
  const sidebarWidgets = widgets.filter(w => w.category === 'sidebar_widgets').sort((a, b) => a.order - b.order);
  const topBarWidgets = widgets.filter(w => w.category === 'top_bar_widgets').sort((a, b) => a.order - b.order);

  const currentSlide = mainSlides[currentSlideIndex];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Building Info */}
            <div className="flex items-center space-x-4">
              <Monitor className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">
                  {building?.name || 'Κτίριο Πληροφοριών'}
                </h1>
                <p className="text-blue-100 text-sm">
                  {building?.address || 'Σύστημα Ενημέρωσης Κατοίκων'}
                </p>
              </div>
            </div>

            {/* Time and Top Bar Widgets */}
            <div className="flex items-center space-x-6">
              {/* Top Bar Widgets */}
              {topBarWidgets.map((widget) => (
                <div key={widget.id}>
                  <WidgetWrapper
                    widget={widget}
                    className="bg-transparent"
                  />
                </div>
              ))}

              {/* Time Display */}
              <div className="text-right">
                <div className="flex items-center space-x-2 text-xl font-mono font-bold">
                  <Clock className="w-5 h-5" />
                  <span>{formatTime(currentTime)}</span>
                </div>
                <div className="text-blue-100 text-sm">
                  {formatDate(currentTime)}
                </div>
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-blue-500/30 hover:bg-blue-500/50 transition-colors"
                title={isFullscreen ? 'Έξοδος από πλήρη οθόνη' : 'Πλήρης οθόνη'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Slides Area */}
        <div className="flex-1 p-6 overflow-hidden">
          {currentSlide ? (
            <div className="h-full relative">
              <div className="h-full">
                <WidgetWrapper
                  widget={currentSlide}
                  className="h-full"
                />
              </div>

              {/* Slide Navigation Indicators */}
              {mainSlides.length > 1 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
                  {mainSlides.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-500 ${
                        index === currentSlideIndex
                          ? 'bg-blue-600 scale-125'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Slide Progress Bar */}
              {mainSlides.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 mx-6">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-100 ease-linear"
                      style={{
                        animation: 'progress 10s linear infinite',
                        animationPlayState: 'running',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Monitor className="w-24 h-24 mx-auto mb-6 opacity-50" />
                <h2 className="text-2xl font-semibold mb-2">Καλώς ήρθατε</h2>
                <p className="text-lg">
                  Δεν υπάρχουν διαθέσιμα περιεχόμενα προς εμφάνιση
                </p>
                <p className="text-sm mt-2 opacity-75">
                  Παρακαλώ επικοινωνήστε με τη διαχείριση
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarWidgets.length > 0 && (
          <div className="w-80 bg-white shadow-lg overflow-y-auto">
            <div className="p-4 space-y-4">
              {sidebarWidgets.map((widget) => (
                <WidgetWrapper
                  key={widget.id}
                  widget={widget}
                  className="w-full"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Ενεργά widgets: {widgets.filter(w => w.enabled).length}</span>
            {mainSlides.length > 1 && (
              <span>Slide {currentSlideIndex + 1} από {mainSlides.length}</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* CSS for slide progress animation */}
      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}