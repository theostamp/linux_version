'use client';

import { useState, useEffect } from 'react';
import { BaseWidgetProps } from '@/types/kiosk';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnnouncementsVotesCarousel from './AnnouncementsVotesCarousel';
import CurrentMonthExpensesWidget from './CurrentMonthExpensesWidget';
import HeatingChartWidget from './HeatingChartWidget';

interface AnnouncementsExpensesSliderProps extends BaseWidgetProps {
  buildingId?: number | null;
}

export default function AnnouncementsExpensesSlider({ data, isLoading, error, buildingId }: AnnouncementsExpensesSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Check if we're in non-heating season (June to September)
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const isNonHeatingSeason = currentMonth >= 6 && currentMonth <= 9;

  // Define base widgets
  const allWidgets = [
    {
      id: 'announcements',
      name: 'Ανακοινώσεις & Ψηφοφορίες',
      Component: AnnouncementsVotesCarousel,
    },
    {
      id: 'expenses',
      name: 'Δαπάνες Τρέχοντος Μήνα',
      Component: CurrentMonthExpensesWidget,
    },
    {
      id: 'heating',
      name: 'Κατανάλωση Θέρμανσης',
      Component: HeatingChartWidget,
    },
  ];

  // Filter out heating widget during non-heating season (June-September)
  const widgets = isNonHeatingSeason 
    ? allWidgets.filter(w => w.id !== 'heating')
    : allWidgets;

  // Auto-advance slider every 15 seconds
  useEffect(() => {
    if (!isAutoPlaying || widgets.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % widgets.length);
    }, 15000); // 15 seconds per widget

    return () => clearInterval(interval);
  }, [isAutoPlaying, widgets.length]);

  // Pause auto-play on hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-xl mb-2">⚠️</div>
          <p className="text-xs">Σφάλμα φόρτωσης δεδομένων</p>
        </div>
      </div>
    );
  }

  const CurrentWidget = widgets[currentIndex].Component;

  return (
    <div 
      className="h-full flex flex-col relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Widget Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full">
          <CurrentWidget 
            data={data} 
            isLoading={false} 
            error={undefined}
            buildingId={buildingId}
          />
        </div>
      </div>

      {/* Navigation Controls */}
      {widgets.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-blue-500/30">
          <button
            onClick={() => setCurrentIndex((prev) => 
              prev === 0 ? widgets.length - 1 : prev - 1
            )}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Previous widget"
          >
            <ChevronLeft className="w-4 h-4 text-blue-300" />
          </button>
          
          {/* Dots indicator */}
          <div className="flex space-x-1.5">
            {widgets.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex 
                    ? 'w-8 h-2 bg-blue-400' 
                    : 'w-2 h-2 bg-blue-600/50 hover:bg-blue-500/70'
                }`}
                aria-label={`Go to ${widgets[index].name}`}
              />
            ))}
          </div>
          
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % widgets.length)}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Next widget"
          >
            <ChevronRight className="w-4 h-4 text-blue-300" />
          </button>
        </div>
      )}

      {/* Widget Name Indicator */}
      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-blue-200 border border-blue-500/30">
        {widgets[currentIndex].name}
      </div>

      {/* Progress bar */}
      {widgets.length > 1 && isAutoPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-900/30 overflow-hidden">
          <div 
            className="h-full bg-blue-400 transition-all duration-75 ease-linear"
            style={{ 
              width: '100%',
              animation: 'progress 15s linear infinite'
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

