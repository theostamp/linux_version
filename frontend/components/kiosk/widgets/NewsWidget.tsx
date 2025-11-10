'use client';

import { useState, useEffect, useRef } from 'react';
import { BaseWidgetProps } from '@/types/kiosk';
import { Globe } from 'lucide-react';
import { useNews } from '@/hooks/useNews';

export default function NewsWidget({ data, isLoading, error }: BaseWidgetProps) {
  const tickerRef = useRef<HTMLDivElement>(null);
  const [newsItems, setNewsItems] = useState<string[]>([]);

  // Use the existing news hook
  const { news, loading: newsLoading, error: newsError } = useNews(180000); // 3 minutes refresh

  // Combine all news items into a continuous ticker
  useEffect(() => {
    if (news && news.length > 0) {
      // Duplicate news items for seamless loop
      setNewsItems([...news, ...news]);
    }
  }, [news]);

  // Continuous scrolling animation
  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker || newsItems.length === 0) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.7; // Increased speed for news ticker (pixels per frame)

    const animate = () => {
      scrollPosition += scrollSpeed;
      
      // Reset position when scrolled past content width
      if (scrollPosition >= ticker.scrollWidth / 2) {
        scrollPosition = 0;
      }
      
      ticker.style.transform = `translateX(-${scrollPosition}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [newsItems]);

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
          <p className="text-sm">Σφάλμα φόρτωσης ειδήσεων</p>
        </div>
      </div>
    );
  }

  if (newsItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-green-200/50">
        <div className="text-center">
          <Globe className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Δεν υπάρχουν διαθέσιμες ειδήσεις</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center w-full overflow-hidden">
      {/* News icon */}
      <Globe className="w-5 h-5 text-green-300 flex-shrink-0 mr-4" />
      
      {/* Continuous scrolling ticker */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={tickerRef}
          className="flex items-center space-x-8 whitespace-nowrap"
          style={{ willChange: 'transform' }}
        >
          {newsItems.map((item, index) => (
            <span
              key={index}
              className="text-base font-medium text-green-100 inline-block"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

