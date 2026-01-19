'use client';

import { useState, useEffect, useMemo } from 'react';
import { BaseWidgetProps } from '@/types/kiosk';
import { Globe } from 'lucide-react';
import { useNews } from '@/hooks/useNews';

export default function NewsWidget({ data, isLoading, error }: BaseWidgetProps) {
  const [newsOpacity, setNewsOpacity] = useState(1);

  // Use the existing news hook
  const { news, loading: newsLoading, error: newsError } = useNews(180000); // 3 minutes refresh

  const adTickerItems = useMemo(() => {
    const ads = (data as any)?.ads?.ticker;
    if (!Array.isArray(ads)) return [];
    return ads
      .map((a: any) => ({
        text: String(a?.creative?.ticker_text || a?.creative?.headline || '').trim(),
      }))
      .filter((a: any) => a.text);
  }, [data]);

  // Build continuous ticker text with colored separators
  const marqueeContent = useMemo(() => {
    const items: Array<{ kind: 'news' | 'ad'; text: string }> = [];
    const safeNews = Array.isArray(news) ? news.filter(Boolean) : [];
    let safeAds = Array.isArray(adTickerItems) ? adTickerItems : [];

    // Fallback if no ads yet
    if (safeAds.length === 0) {
      safeAds = [{ text: 'Χορηγούμενο μήνυμα γειτονιάς' }];
    }

    if (safeNews.length === 0 && safeAds.length === 0) return null;

    // Interleave: every 3 news items insert 1 ad (if any). If no news, show ads only.
    let adIndex = 0;
    for (let i = 0; i < safeNews.length; i += 1) {
      items.push({ kind: 'news', text: String(safeNews[i]) });
      if ((i + 1) % 3 === 0 && safeAds.length > 0) {
        items.push({ kind: 'ad', text: safeAds[adIndex % safeAds.length].text });
        adIndex += 1;
      }
    }
    if (safeNews.length === 0 && safeAds.length > 0) {
      safeAds.forEach((a) => items.push({ kind: 'ad', text: a.text }));
    }

    // Duplicate for seamless loop
    const loop = [...items, ...items];

    return loop.map((item, idx) => (
      <span key={idx} className="inline-flex items-center">
        {item.kind === 'ad' ? (
          <>
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-widest mr-3 shadow-lg ${
              item.text === 'Χορηγούμενο μήνυμα γειτονιάς'
                ? 'bg-blue-500/70 text-white'
                : 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.3)]'
            }`}>
              ΧΟΡΗΓΙΑ
            </span>
            <span className={`text-lg font-bold ${
              item.text === 'Χορηγούμενο μήνυμα γειτονιάς'
                ? 'text-blue-100 italic'
                : 'text-yellow-100'
            }`}>
              {item.text}
            </span>
          </>
        ) : (
          <span className="text-white font-medium text-lg opacity-90">{item.text}</span>
        )}
        <span className="mx-12 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
        </span>
      </span>
    ));
  }, [news, adTickerItems]);

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

  if (news.length === 0 && adTickerItems.length === 0) {
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
      <div className="flex items-center space-x-6 w-full h-full">
        {/* News label */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[12px] font-black uppercase tracking-[0.2em] text-white/40 flex-shrink-0">
            <Globe className="w-4 h-4" />
            <span>Τοπικά</span>
          </div>

        {/* Continuous scrolling ticker - slower speed, tighter spacing */}
        <div className="relative flex-1 overflow-hidden h-full flex items-center">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-transparent to-transparent pointer-events-none z-10" />
          <div className="whitespace-nowrap animate-ticker flex items-center">
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
          animation: ticker 720s linear infinite;
        }

        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
