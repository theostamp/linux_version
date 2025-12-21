'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BaseWidgetProps } from '@/types/kiosk';
import type { KioskAd } from '@/hooks/useKioskData';

export default function AdInterstitialOverlay({ data }: BaseWidgetProps) {
  const interstitialAds: KioskAd[] = useMemo(() => {
    const ads = (data as any)?.ads?.interstitial;
    return Array.isArray(ads) ? (ads as KioskAd[]) : [];
  }, [data]);

  const [isVisible, setIsVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (interstitialAds.length === 0) return;

    // Show an interstitial every 5 minutes for 10 seconds
    const show = () => {
      setIndex((p) => (p + 1) % interstitialAds.length);
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 10000);
    };

    const initial = setTimeout(show, 120000); // first after 2 minutes
    const interval = setInterval(show, 5 * 60 * 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [interstitialAds.length]);

  if (!isVisible || interstitialAds.length === 0) return null;

  const ad = interstitialAds[index % interstitialAds.length];
  const c = ad?.creative;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-[92%] max-w-5xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200/90 mb-3">Χορηγούμενο</div>
            <div className="text-3xl md:text-4xl font-semibold text-white leading-tight">
              {(c?.headline || c?.ticker_text || 'Τοπική προσφορά').slice(0, 90)}
            </div>
            {c?.body ? (
              <div className="mt-4 text-lg text-white/80 leading-snug">
                {c.body.slice(0, 220)}
              </div>
            ) : null}
            <div className="mt-6 text-sm text-white/60">
              {c?.cta_url ? 'Δείτε περισσότερα online' : 'Περάστε από το κατάστημα'}
            </div>
          </div>
          {c?.image_url ? (
            <div className="w-full md:w-[40%] rounded-2xl overflow-hidden border border-white/10 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


