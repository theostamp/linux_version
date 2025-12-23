'use client';

import { useState, useEffect, useMemo } from 'react';
import WeatherWidgetMorningOverview from '@/components/kiosk/widgets/WeatherWidgetMorningOverview';
import QRCodeWidget from '@/components/kiosk/widgets/QRCodeWidget';
import AssemblyAnnouncementWidget from '@/components/kiosk/widgets/AssemblyAnnouncementWidget';
import VoteResultsBannerWidget from '@/components/kiosk/widgets/VoteResultsBannerWidget';
import EmergencyWidget from '@/components/kiosk/widgets/EmergencyWidget';
import ApartmentDebtsWidget from '@/components/kiosk/widgets/ApartmentDebtsWidget';
import AnnouncementsExpensesSlider from '@/components/kiosk/widgets/AnnouncementsExpensesSlider';
import ManagementOfficeWidget from '@/components/kiosk/widgets/ManagementOfficeWidget';
import NewsWidget from '@/components/kiosk/widgets/NewsWidget';
import AdBannerWidget from '@/components/kiosk/widgets/AdBannerWidget';
import AdInterstitialOverlay from '@/components/kiosk/widgets/AdInterstitialOverlay';
import { Building2 } from 'lucide-react';

interface MorningOverviewSceneCustomProps {
  data?: any;
  buildingId?: number | null;
}

type ScenePalette = {
  background: string;
  overlay: string;
  sidebarSurface: string;
  cardSurface: string;
  tickerSurface: string;
  accentBorder: string;
};

const getScenePalette = (hour: number): ScenePalette => {
  if (hour >= 6 && hour < 12) {
    return {
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 45%, #312e81 100%)',
      overlay: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.18), transparent 55%)',
      sidebarSurface: 'rgba(15, 23, 42, 0.72)',
      cardSurface: 'rgba(15, 23, 42, 0.78)',
      tickerSurface: 'rgba(2, 6, 23, 0.82)',
      accentBorder: 'rgba(125, 211, 252, 0.5)',
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      background: 'linear-gradient(135deg, #0f172a 0%, #312e81 45%, #9333ea 100%)',
      overlay: 'radial-gradient(circle at 70% 30%, rgba(236,72,153,0.2), transparent 60%)',
      sidebarSurface: 'rgba(30, 27, 75, 0.72)',
      cardSurface: 'rgba(30, 27, 75, 0.78)',
      tickerSurface: 'rgba(15, 23, 42, 0.85)',
      accentBorder: 'rgba(196, 181, 253, 0.5)',
    };
  }

  return {
    background: 'linear-gradient(135deg, #020617 0%, #0f172a 30%, #1e1b4b 100%)',
    overlay: 'radial-gradient(circle at 80% 10%, rgba(129,140,248,0.25), transparent 50%)',
    sidebarSurface: 'rgba(2, 6, 23, 0.78)',
    cardSurface: 'rgba(2, 6, 23, 0.82)',
    tickerSurface: 'rgba(2, 6, 23, 0.9)',
    accentBorder: 'rgba(147, 197, 253, 0.45)',
  };
};

export default function MorningOverviewSceneCustom({ data, buildingId }: MorningOverviewSceneCustomProps) {
  const [currentSidebarWidget, setCurrentSidebarWidget] = useState(0);
  const [paletteHour, setPaletteHour] = useState(() => new Date().getHours());

  // Sidebar widgets that will auto-scroll with slide animation
  const sidebarWidgets = useMemo(() => {
    const base = [
      { id: 'emergency-contacts', name: 'Τηλέφωνα Έκτακτης Ανάγκης', Component: EmergencyWidget },
      { id: 'qr-connect', name: 'Σύνδεση με QR', Component: QRCodeWidget },
    ];
    const hasBannerAds = Array.isArray((data as any)?.ads?.banner) && (data as any).ads.banner.length > 0;
    if (hasBannerAds) {
      base.push({ id: 'ad-banner', name: 'Χορηγούμενο', Component: AdBannerWidget });
      // Extra dedicated ad slot for rotation
      base.push({ id: 'ad-slot-2', name: 'Διαφήμιση', Component: AdBannerWidget });
    }
    return base;
  }, [data]);

  // Per-widget display durations (ms)
  const sidebarWidgetDurations = useMemo(() => {
    return {
      default: 10000,
      'emergency-contacts': 12000,
      'qr-connect': 9000,
      'ad-banner': 15000,
      'ad-slot-2': 15000,
    } as Record<string, number>;
  }, []);

  // Auto-scroll sidebar widgets with per-widget duration
  useEffect(() => {
    if (sidebarWidgets.length <= 1) return;

    const currentId = sidebarWidgets[currentSidebarWidget]?.id;
    const duration = sidebarWidgetDurations[currentId] ?? sidebarWidgetDurations.default ?? 10000;

    const timer = setTimeout(() => {
      setCurrentSidebarWidget((prev) => (prev + 1) % sidebarWidgets.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentSidebarWidget, sidebarWidgets, sidebarWidgetDurations]);

  useEffect(() => {
    const timer = setInterval(() => setPaletteHour(new Date().getHours()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const palette = useMemo(() => getScenePalette(paletteHour), [paletteHour]);
  const todayIso = new Date().toISOString().split('T')[0];
  const votes = useMemo(() => (Array.isArray(data?.votes) ? data.votes : []), [data?.votes]);
  const activeVotes = useMemo(
    () => votes.filter((vote: any) => !vote?.end_date || vote.end_date >= todayIso),
    [votes, todayIso]
  );
  const showImportantAssembly = Boolean(data?.upcoming_assembly) || votes.length > 0;
  const showImportantVoteResults = activeVotes.length > 0;
  const showImportantBlock = showImportantAssembly || showImportantVoteResults;

  return (
    <div
      className="relative h-screen w-screen flex overflow-hidden pb-20 gap-2 text-white"
      style={{ background: palette.background }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: palette.overlay }} />
      <div className="relative flex h-full w-full gap-2">
        {/* Left Sidebar - 23% */}
        <div className="w-[23%] min-w-[300px] flex flex-col space-y-4 p-4">
          {/* Sticky Top - Important Announcements (Assembly/Votes) with Custom Format */}
          {showImportantBlock && (
            <div
              className="flex-1 min-h-0 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden border"
              style={{ backgroundColor: palette.sidebarSurface, borderColor: palette.accentBorder }}
            >
              <div className="h-full p-3 flex flex-col gap-3">
                {showImportantAssembly && (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <AssemblyAnnouncementWidget data={data} isLoading={false} error={null} buildingId={buildingId} />
                  </div>
                )}
                {showImportantVoteResults && (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <VoteResultsBannerWidget data={data} isLoading={false} error={null} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auto-Scrolling Widgets Area - Slide Animation */}
          <div
            className="flex-1 min-h-0 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden relative border"
            style={{ backgroundColor: palette.sidebarSurface, borderColor: palette.accentBorder }}
          >
            {/* Sliding Widget Container - Smooth Film Strip Animation */}
            <div className="h-full w-full relative overflow-hidden">
              {sidebarWidgets.map((widget, index) => {
                const WidgetComp = widget.Component;
                return (
                  <div
                    key={widget.id}
                    className="absolute inset-0"
                    style={{
                      transform: `translateY(${(index - currentSidebarWidget) * 100}%)`,
                      transition: 'transform 1400ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 600ms ease',
                      willChange: 'transform',
                      opacity: index === currentSidebarWidget ? 1 : 0,
                    }}
                  >
                    <div className="h-full w-full p-4">
                      <WidgetComp data={data} isLoading={false} error={undefined} buildingId={buildingId} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Area - 54% with stacked widgets */}
        <div className="w-[54%] min-w-[640px] flex flex-col space-y-4 p-4">
          {/* Management Office Widget - Top */}
          <div
            className="relative h-[15%] backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden border"
            style={{ backgroundColor: palette.cardSurface, borderColor: palette.accentBorder }}
          >
            <div className="h-full">
              <ManagementOfficeWidget data={data} isLoading={false} error={undefined} />
            </div>
          </div>

          {/* Weather Widget - Morning Overview */}
          <div
            className="h-[39%] backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden border"
            style={{ backgroundColor: palette.cardSurface, borderColor: palette.accentBorder }}
          >
            <div className="h-full p-4">
              <WeatherWidgetMorningOverview data={data} isLoading={false} error={undefined} />
            </div>
          </div>

          {/* Announcements, Expenses & Heating Chart Slider - Bottom */}
          <div
            className="h-[28%] backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden border"
            style={{ backgroundColor: palette.cardSurface, borderColor: palette.accentBorder }}
          >
            <div className="h-full p-4">
              <AnnouncementsExpensesSlider data={data} isLoading={false} error={undefined} buildingId={buildingId} />
            </div>
          </div>
        </div>

        {/* Right Area - 23% - Common Expenses Summary Widget (Compact) */}
        <div className="w-[23%] min-w-[320px] p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-indigo-200/80">Κοινόχρηστα</p>
              <p className="text-sm font-semibold text-white">Πορεία εισπράξεων</p>
            </div>
            <div className="flex items-center text-[11px] text-indigo-200/70">
              <Building2 className="w-3.5 h-3.5 mr-1" />
              {data?.building_info?.name || 'Κτίριο'}
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <div
              className="flex-1 min-h-0 w-full backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden border"
              style={{ backgroundColor: palette.cardSurface, borderColor: palette.accentBorder }}
            >
              <div className="h-full w-full p-4">
                <ApartmentDebtsWidget data={data} isLoading={false} error={undefined} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* News Widget - Fixed to bottom with breathing room */}
      <div
        className="fixed bottom-4 left-5 right-5 h-20 backdrop-blur-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl z-50 overflow-hidden"
        style={{ backgroundColor: palette.tickerSurface, borderColor: palette.accentBorder }}
      >
        <div className="h-full px-8">
          <NewsWidget data={data} isLoading={false} error={undefined} />
        </div>
      </div>

      {/* Copyright Footer - Discrete lime text below news ticker */}
      <div className="fixed bottom-0.5 left-0 right-0 h-3 flex items-center justify-center z-40">
        <p className="text-[9px] text-lime-200/60 font-normal tracking-wide">
          © {new Date().getFullYear()} New Concierge. All rights reserved.
        </p>
      </div>

      {/* Whole-page interstitial ad (low frequency) */}
      <AdInterstitialOverlay data={data} isLoading={false} error={undefined} />
    </div>
  );
}
