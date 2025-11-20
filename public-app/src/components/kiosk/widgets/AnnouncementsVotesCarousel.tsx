'use client';

import { useState, useEffect } from 'react';
import { BaseWidgetProps } from '@/types/kiosk';
import { Bell, Vote, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function AnnouncementsVotesCarousel({ data, isLoading, error }: BaseWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Filter announcements to exclude assembly-related ones (since they're in left sidebar)
  const filteredAnnouncements = (data?.announcements || []).filter((ann: any) => 
    !ann.title?.toLowerCase().includes('συνέλευση') && 
    !ann.title?.toLowerCase().includes('σύγκληση')
  );

  // Get votes data
  const votes = data?.votes || [];

  // Combine announcements and votes for carousel
  const carouselItems = [
    ...filteredAnnouncements.map((ann: any) => ({
      id: `announcement-${ann.id}`,
      type: 'announcement',
      title: ann.title,
      content: ann.content,
      date: ann.created_at,
      icon: Bell,
      bgColor: 'from-blue-600/20 to-blue-800/20',
      borderColor: 'border-blue-500/30'
    })),
    ...votes.map((vote: any) => ({
      id: `vote-${vote.id}`,
      type: 'vote',
      title: vote.title,
      content: vote.description,
      date: vote.created_at,
      icon: Vote,
      bgColor: 'from-purple-600/20 to-purple-800/20',
      borderColor: 'border-purple-500/30'
    }))
  ];
  const renderCard = (item: any) => (
    <div className={`flex-1 bg-gradient-to-br ${item.bgColor} backdrop-blur-sm rounded-lg border ${item.borderColor} p-3 overflow-hidden`}>
      <div className="h-full flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between text-[11px] text-blue-200/80">
          <span className={`px-2 py-1 rounded-full border ${item.type === 'announcement' ? 'border-blue-500/40 bg-blue-700/20' : 'border-purple-500/40 bg-purple-700/20'}`}>
            {item.type === 'announcement' ? 'Ανακοίνωση' : 'Ψηφοφορία'}
          </span>
          <span className="text-[11px] text-blue-100">
            {format(new Date(item.date), 'dd/MM', { locale: el })}
          </span>
        </div>
        <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
          {item.title}
        </h4>
        <p className="text-xs text-blue-100 leading-snug line-clamp-3 flex-1">
          {item.content}
        </p>
      </div>
    </div>
  );

  // Auto-advance carousel every 8 seconds
  useEffect(() => {
    if (!isAutoPlaying || carouselItems.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, carouselItems.length]);

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
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">Σφάλμα φόρτωσης δεδομένων</p>
        </div>
      </div>
    );
  }

  if (carouselItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-blue-200/50">
        <div className="text-center">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Δεν υπάρχουν διαθέσιμες ανακοινώσεις ή ψηφοφορίες</p>
        </div>
      </div>
    );
  }

  const currentItem = carouselItems[currentIndex];
  const IconComponent = currentItem.icon;

  return (
    <div 
      className="h-full flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-500/20">
        <div className="flex items-center space-x-2">
          <IconComponent className="w-5 h-5 text-blue-300" />
          <h3 className="text-lg font-semibold text-white">
            {currentItem.type === 'announcement' ? 'Ανακοίνωση' : 'Ψηφοφορία'}
          </h3>
        </div>
        
        {/* Navigation indicators */}
        {carouselItems.length > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentIndex((prev) => 
                prev === 0 ? carouselItems.length - 1 : prev - 1
              )}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-blue-300" />
            </button>
            
            {/* Dots indicator */}
            <div className="flex space-x-1">
              {carouselItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex 
                      ? 'bg-blue-400' 
                      : 'bg-blue-600/50 hover:bg-blue-500/70'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % carouselItems.length)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-blue-300" />
            </button>
          </div>
        )}
      </div>

      {/* Content - Two items side by side */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-2 gap-3">
          {/* First Item */}
          {renderCard(currentItem)}

          {/* Second Item */}
          {carouselItems.length > 1 ? (
            renderCard(carouselItems[(currentIndex + 1) % carouselItems.length])
          ) : (
            <div className="h-full bg-gradient-to-br from-gray-800/20 to-gray-900/20 backdrop-blur-sm rounded-lg border border-gray-600/30 p-3 flex items-center justify-center">
              <p className="text-xs text-gray-400 text-center">Δεν υπάρχει δεύτερη ανακοίνωση</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {carouselItems.length > 1 && (
        <div className="mt-3 h-1 bg-blue-900/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-400 transition-all duration-75 ease-linear"
            style={{ 
              width: isAutoPlaying ? '100%' : '0%',
              animation: isAutoPlaying ? 'progress 8s linear infinite' : 'none'
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
