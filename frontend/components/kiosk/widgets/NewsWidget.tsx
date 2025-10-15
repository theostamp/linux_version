'use client';

import { useState, useEffect } from 'react';
import { BaseWidgetProps } from '@/types/kiosk';
import { Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNews } from '@/hooks/useNews';

export default function NewsWidget({ data, isLoading, error }: BaseWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [newsOpacity, setNewsOpacity] = useState(1);

  // Use the existing news hook
  const { news, loading: newsLoading, error: newsError } = useNews(180000); // 3 minutes refresh

  // Auto-advance news every 12 seconds (same as KioskMode)
  useEffect(() => {
    if (!isAutoPlaying || news.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % news.length;
        
        // Fade out current text
        setNewsOpacity(0);
        
        // Change text after fade out
        setTimeout(() => {
          setNewsOpacity(1);
        }, 500); // Wait 500ms for fade out
        
        return nextIndex;
      });
    }, 12000); // 12 seconds per news item

    return () => clearInterval(interval);
  }, [isAutoPlaying, news.length]);

  // Pause auto-play on hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  if (isLoading || newsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-300"></div>
      </div>
    );
  }

  if (error || newsError) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-xl mb-2">⚠️</div>
          <p className="text-xs">Σφάλμα φόρτωσης ειδήσεων</p>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-green-200/50">
        <div className="text-center">
          <Globe className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Δεν υπάρχουν διαθέσιμες ειδήσεις</p>
        </div>
      </div>
    );
  }

  const currentNews = news[currentIndex];

  return (
    <div 
      className="h-full flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1">
          <Globe className="w-3 h-3 text-green-300" />
          <h3 className="text-xs font-semibold text-white">Ειδήσεις</h3>
        </div>
        
        {/* Navigation indicators - Compact */}
        {news.length > 1 && (
          <div className="flex items-center space-x-1">
            {/* Dots indicator only */}
            <div className="flex space-x-1">
              {news.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-1 h-1 rounded-full transition-colors ${
                    index === currentIndex 
                      ? 'bg-green-400' 
                      : 'bg-green-600/50 hover:bg-green-500/70'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content - Compact */}
      <div className="flex-1 bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-lg border border-green-500/30 p-2 overflow-hidden">
        <div className="h-full flex flex-col justify-center">
          {/* News text with fade animation - Compact */}
          <div 
            className="text-xs text-green-100 leading-tight text-center"
            style={{ opacity: newsOpacity, transition: 'opacity 0.5s ease-in-out' }}
          >
            {currentNews}
          </div>
        </div>
      </div>

      {/* Progress bar - Compact */}
      {news.length > 1 && (
        <div className="mt-1 h-0.5 bg-green-900/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-400 transition-all duration-120 ease-linear"
            style={{ 
              width: isAutoPlaying ? '100%' : '0%',
              animation: isAutoPlaying ? 'progress 12s linear infinite' : 'none'
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
