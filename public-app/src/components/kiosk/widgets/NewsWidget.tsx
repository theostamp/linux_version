'use client';

import { useState, useEffect, useMemo } from 'react';
import { BaseWidgetProps } from '@/types/kiosk';
import { Globe } from 'lucide-react';
import { useNews } from '@/hooks/useNews';

export default function NewsWidget({ data, isLoading, error }: BaseWidgetProps) {
  const [newsOpacity, setNewsOpacity] = useState(1);

  // Use the existing news hook
  const { news, loading: newsLoading, error: newsError } = useNews(180000); // 3 minutes refresh

  // Build continuous ticker text with colored separators
  const marqueeContent = useMemo(() => {
    if (news.length === 0) return null;
    
    // Duplicate news array for seamless loop
    const allNews = [...news, ...news];
    
    return allNews.map((item, idx) => (
      <span key={idx} className="inline-flex items-center">
        <span className="text-emerald-50">{item}</span>
        <span className="mx-4 text-amber-400 font-bold">◆</span>
      </span>
    ));
  }, [news]);

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

  return (
    <div className="h-full flex items-center">
      {/* News ticker - Horizontal layout */}
      <div className="flex items-center space-x-3 w-full">
        {/* News label */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] uppercase tracking-[0.14em] text-emerald-100 flex-shrink-0">
          <Globe className="w-3.5 h-3.5" />
          <span>Νέα</span>
        </div>
        
        {/* Continuous scrolling ticker - slower speed, tighter spacing */}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10" />
          <div className="text-sm whitespace-nowrap animate-ticker">
            {marqueeContent}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
