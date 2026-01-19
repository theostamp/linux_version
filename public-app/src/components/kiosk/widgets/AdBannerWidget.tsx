'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BaseWidgetProps } from '@/types/kiosk';
import type { KioskAd } from '@/hooks/useKioskData';

export default function AdBannerWidget({ data }: BaseWidgetProps) {
  const bannerAds: KioskAd[] = useMemo(() => {
    const ads = (data as any)?.ads?.banner;
    return Array.isArray(ads) ? (ads as KioskAd[]) : [];
  }, [data]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (bannerAds.length <= 1) return;
    const t = setInterval(() => setIndex((p) => (p + 1) % bannerAds.length), 8000);
    return () => clearInterval(t);
  }, [bannerAds.length]);

  if (bannerAds.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-white/60">
        <div className="text-center p-4 border border-dashed border-white/20 rounded-2xl animate-pulse">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Promotion</div>
          <div className="text-sm font-bold text-white/80 leading-relaxed italic">
            Εδώ μπορείτε να προβάλετε την επιχείρησή σας
          </div>
          <div className="text-[9px] mt-2 uppercase tracking-widest text-indigo-300 font-bold">
            InfoPoint Advertising
          </div>
        </div>
      </div>
    );
  }

  const ad = bannerAds[index % bannerAds.length];
  const c = ad?.creative;

  return (
    <div className="h-full w-full flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">Χορηγούμενο μήνυμα</div>
        <div className="text-[10px] text-white/40">Ad</div>
      </div>

      <div className="mt-2 flex-1 min-h-0 flex gap-3">
        {c?.image_url ? (
          <div className="w-[38%] rounded-xl overflow-hidden border border-white/10 bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold leading-snug text-white">
            {(c?.headline || c?.ticker_text || '').slice(0, 80) || 'Τοπική προσφορά'}
          </div>
          {c?.body ? (
            <div className="mt-1 text-sm text-white/80 leading-snug">
              {c.body.slice(0, 140)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="pt-2 text-[11px] text-white/55">
        {c?.cta_url ? 'Δείτε περισσότερα online' : 'Ρωτήστε στο κατάστημα'}
      </div>
    </div>
  );
}
