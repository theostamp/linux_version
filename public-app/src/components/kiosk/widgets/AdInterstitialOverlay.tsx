'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BaseWidgetProps } from '@/types/kiosk';
import type { KioskAd } from '@/hooks/useKioskData';
import { Timer, Info, Play, ArrowLeft } from 'lucide-react';

type AdStatus = 'idle' | 'warning' | 'showing';

export default function AdInterstitialOverlay({ data }: BaseWidgetProps) {
  const interstitialAds: KioskAd[] = useMemo(() => {
    const ads = (data as any)?.ads?.interstitial;
    return Array.isArray(ads) ? (ads as KioskAd[]) : [];
  }, [data]);

  const [status, setStatus] = useState<AdStatus>('idle');
  const [countdown, setCountdown] = useState(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (interstitialAds.length === 0) return;

    const AD_DURATION = 15; // seconds
    const WARNING_DURATION = 5; // seconds
    const INTERVAL = 5 * 60 * 1000; // 5 minutes

    const runCycle = () => {
      // 1. Start Warning
      setStatus('warning');
      setCountdown(WARNING_DURATION);
      
      const warningInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(warningInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 2. Start Ad after Warning
      setTimeout(() => {
        setIndex((p) => (p + 1) % interstitialAds.length);
        setStatus('showing');
        setCountdown(AD_DURATION);

        const adInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(adInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // 3. Finish Ad
        setTimeout(() => {
          setStatus('idle');
        }, AD_DURATION * 1000);

      }, WARNING_DURATION * 1000);
    };

    const initial = setTimeout(runCycle, 120000); // first after 2 minutes
    const mainInterval = setInterval(runCycle, INTERVAL);

    return () => {
      clearTimeout(initial);
      clearInterval(mainInterval);
    };
  }, [interstitialAds.length]);

  if (interstitialAds.length === 0) return null;

  const ad = interstitialAds[index % interstitialAds.length];
  const c = ad?.creative;

  return (
    <>
      {/* 1. Warning Banner (during 'warning' status) */}
      {status === 'warning' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] animate-in slide-in-from-top-10 duration-500">
          <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-amber-500 p-[2px] rounded-2xl shadow-[0_20px_50px_rgba(245,158,11,0.4)]">
            <div className="bg-slate-950 px-8 py-4 rounded-[14px] flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500 blur-md opacity-20 animate-pulse" />
                <Timer className="w-8 h-8 text-amber-400 relative z-10" />
              </div>
              <div className="flex flex-col">
                <span className="text-amber-200/60 text-[10px] font-black uppercase tracking-widest">Ενημέρωση Προβολής</span>
                <span className="text-white font-bold text-lg leading-tight">
                  Σε <span className="text-amber-400 text-2xl tabular-nums">{countdown}</span> δευτερόλεπτα θα προβληθεί ένα σύντομο μήνυμα
                </span>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Full Screen Ad (during 'showing' status) */}
      {status === 'showing' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 animate-in fade-in zoom-in-95 duration-700">
          {/* Background Ambient Effect */}
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.2),transparent_70%)]" />
          
          {/* Ad Content Card */}
          <div className="relative w-[92%] max-w-6xl aspect-[16/9] md:aspect-auto rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] bg-slate-900/80 backdrop-blur-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-slate-950/50" />
            
            <div className="relative h-full p-10 md:p-16 flex flex-col md:flex-row gap-12 items-center">
              {/* Image Section */}
              {c?.image_url && (
                <div className="w-full md:w-[45%] h-[300px] md:h-full rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl group">
                  <img src={c.image_url} alt="" className="h-full w-full object-cover transition-transform duration-10000 group-hover:scale-110" />
                </div>
              )}

              {/* Text Section */}
              <div className="flex-1 space-y-8 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest">
                  <Play className="w-3 h-3 fill-current" /> Χορηγούμενη Προβολή
                </div>
                
                <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight">
                  {c?.headline || c?.ticker_text || 'Τοπική προσφορά'}
                </h2>
                
                {c?.body && (
                  <p className="text-xl md:text-2xl text-slate-300 font-medium leading-relaxed opacity-90">
                    {c.body}
                  </p>
                )}

                <div className="pt-6 flex flex-col md:flex-row items-center gap-6">
                  <div className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-black text-lg shadow-xl shadow-white/10">
                    {c?.cta_url ? 'ΜΑΘΕΤΕ ΠΕΡΙΣΣΟΤΕΡΑ' : 'ΕΠΙΣΚΕΦΘΕΙΤΕ ΜΑΣ'}
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-tighter text-sm">
                    <Info className="w-5 h-5 text-indigo-400" />
                    <span>Ενημερωθείτε στην είσοδο ή στο κινητό σας</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Countdown (TV style) */}
            <div className="absolute bottom-10 right-10 flex items-center gap-4 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10">
              <ArrowLeft className="w-5 h-5 text-indigo-400 animate-pulse" />
              <div className="text-white font-bold text-sm uppercase tracking-widest">
                Επιστροφή σε <span className="text-indigo-400 text-xl tabular-nums ml-1">{countdown}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


