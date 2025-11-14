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

  // Auto-advance news every 8 seconds (faster for ticker effect)
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
        }, 300); // Faster transition for ticker effect
        
        return nextIndex;
      });
    }, 8000); // 8 seconds per news item for ticker effect

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
      className="h-full flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* News ticker - Horizontal layout without dots */}
      <div className="flex items-center space-x-3 w-full">
        {/* News icon */}
        <Globe className="w-3 h-3 text-green-300 flex-shrink-0" />
        
        {/* News text with fade animation - Continuous ticker */}
        <div 
          className="flex-1 text-xs text-green-100 whitespace-nowrap overflow-hidden"
          style={{ opacity: newsOpacity, transition: 'opacity 0.3s ease-in-out' }}
        >
          <div className="animate-scroll-left">
            {currentNews}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        .animate-scroll-left {
          animation: scroll-left 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
