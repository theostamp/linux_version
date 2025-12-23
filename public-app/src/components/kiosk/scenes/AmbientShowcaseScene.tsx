'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Clock, Thermometer, Smartphone, Building2, CloudSun, Check, Calendar, AlertCircle, MapPin, Users } from 'lucide-react';
import type { KioskData, KioskAnnouncement } from '@/hooks/useKioskData';
import { useKioskWeather, type KioskWeatherData } from '@/hooks/useKioskWeather';
import QRCodeLib from 'qrcode';
import { format, parseISO, differenceInDays, differenceInHours, isBefore, startOfDay } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  AmbientBrandingConfig,
  resolveAmbientBranding,
} from '@/components/kiosk/scenes/branding';
import ActiveVoteWidget from '@/components/kiosk/widgets/ActiveVoteWidget';
import NewsWidget from '@/components/kiosk/widgets/NewsWidget';
import AdBannerWidget from '@/components/kiosk/widgets/AdBannerWidget';
import AdInterstitialOverlay from '@/components/kiosk/widgets/AdInterstitialOverlay';

interface AmbientShowcaseSceneProps {
  data?: KioskData | null;
  buildingId?: number | null;
  brandingConfig?: Partial<AmbientBrandingConfig>;
}

// Match "Πρωινή Επισκόπηση" vibe for widget surfaces/typography.
type ScenePalette = {
  overlay: string;
  sidebarSurface: string;
  tickerSurface: string;
  accentBorder: string;
};

const getScenePalette = (hour: number): ScenePalette => {
  if (hour >= 6 && hour < 12) {
    return {
      overlay: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.18), transparent 55%)',
      sidebarSurface: 'rgba(15, 23, 42, 0.72)',
      tickerSurface: 'rgba(2, 6, 23, 0.82)',
      accentBorder: 'rgba(125, 211, 252, 0.5)',
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      overlay: 'radial-gradient(circle at 70% 30%, rgba(236,72,153,0.2), transparent 60%)',
      sidebarSurface: 'rgba(30, 27, 75, 0.72)',
      tickerSurface: 'rgba(15, 23, 42, 0.85)',
      accentBorder: 'rgba(196, 181, 253, 0.5)',
    };
  }

  return {
    overlay: 'radial-gradient(circle at 80% 10%, rgba(129,140,248,0.25), transparent 50%)',
    sidebarSurface: 'rgba(2, 6, 23, 0.78)',
    tickerSurface: 'rgba(2, 6, 23, 0.9)',
    accentBorder: 'rgba(147, 197, 253, 0.45)',
  };
};

const formatGreekDate = (date: Date) => ({
  day: date.toLocaleDateString('el-GR', { day: '2-digit' }),
  month: date.toLocaleDateString('el-GR', { month: 'long' }),
  weekday: date.toLocaleDateString('el-GR', { weekday: 'long' }),
  year: date.getFullYear(),
});

// Weather extraction functions - now using the weather hook data
const extractTemperature = (weatherData: KioskWeatherData | null): number | null => {
  if (weatherData?.current?.temperature !== undefined) {
    return Math.round(weatherData.current.temperature);
  }
  return null;
};

const extractWeatherCondition = (weatherData: KioskWeatherData | null): string | null => {
  return weatherData?.current?.condition || null;
};

type AmbientVideoKey = 'rain_city' | 'windy_city' | 'cozy_fireplace';

const AMBIENT_VIDEOS: Record<AmbientVideoKey, string> = {
  rain_city: '/ambient-videos/rain_city.mp4',
  windy_city: '/ambient-videos/windy_city.mp4',
  cozy_fireplace: '/ambient-videos/cozy_fireplace.mp4',
};

const normalizeGreek = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    // Remove accents/diacritics for robust matching (e.g. "βροχή" == "βροχη")
    .replace(/\p{Diacritic}/gu, '');

const parseTimeHHMM = (hhmm?: string | null): { hours: number; minutes: number } | null => {
  if (!hhmm) return null;
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
};

const isNightBySunriseSunset = (now: Date, sunrise?: string, sunset?: string): boolean => {
  const sr = parseTimeHHMM(sunrise);
  const ss = parseTimeHHMM(sunset);
  if (!sr || !ss) {
    // Fallback: simple time-of-day heuristic
    const h = now.getHours();
    return h >= 20 || h < 6;
  }

  const sunriseDate = new Date(now);
  sunriseDate.setHours(sr.hours, sr.minutes, 0, 0);
  const sunsetDate = new Date(now);
  sunsetDate.setHours(ss.hours, ss.minutes, 0, 0);

  // If current time is before sunrise or after sunset => night
  return now < sunriseDate || now > sunsetDate;
};

const pickAmbientVideo = (weatherData: KioskWeatherData | null, now: Date): string | null => {
  const conditionRaw = extractWeatherCondition(weatherData) ?? '';
  const condition = conditionRaw ? normalizeGreek(conditionRaw) : '';
  const temp = extractTemperature(weatherData);
  const wind = weatherData?.current?.wind_speed;

  const isRain =
    condition.includes('βροχ') ||
    condition.includes('μπορ') ||
    condition.includes('καταιγ');
  const isWindy =
    condition.includes('ανεμ') ||
    (typeof wind === 'number' && wind >= 25);

  // Cozy fireplace: slightly higher threshold (for kiosk ambience)
  const COZY_TEMP_C = 14;
  const isCozyCold = typeof temp === 'number' && temp <= COZY_TEMP_C;

  // Note: with current available videos we keep mapping simple.
  // Priority: rain > windy > cozy
  if (isRain) return AMBIENT_VIDEOS.rain_city;
  if (isWindy) return AMBIENT_VIDEOS.windy_city;
  if (isCozyCold) return AMBIENT_VIDEOS.cozy_fireplace;

  // If no match, keep non-video background (e.g. gradient or configured branding image).
  return null;
};

// Helper functions to extract assembly info from description
function extractTime(description: string): string | null {
  if (!description) return null;
  const patterns = [
    /[ώω]ρα[:\s]+(\d{1,2}:\d{2})/i,
    /[ώω]ρα[:\s]+(\d{1,2}\.\d{2})/i,
    /στις\s+(\d{1,2}:\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1].trim().replace('.', ':');
  }
  return null;
}

function extractLocation(description: string): string | null {
  if (!description) return null;
  const patterns = [
    /τοποθεσ[ίι]α[:\s]+([^\n]+)/i,
    /χ[ώω]ρος[:\s]+([^\n]+)/i,
    /αίθουσα[:\s]+([^\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

// Helper to check if announcement has voting
function hasVoting(announcement: KioskAnnouncement): boolean {
  const titleLower = announcement.title?.toLowerCase() || '';
  const descLower = announcement.description?.toLowerCase() || '';
  return titleLower.includes('ψηφοφορ') || 
         titleLower.includes('ψήφ') ||
         descLower.includes('ψηφοφορ') || 
         descLower.includes('ψήφ') ||
         descLower.includes('θέματα ημερήσιας διάταξης');
}

// Assembly data from API
interface AssemblyAPIData {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  location?: string;
  status: string;
  is_pre_voting_active?: boolean;
  agenda_items?: Array<{ id: string; title: string; item_type: string }>;
}

// Helper: derive assembly from announcements (fallback)
function deriveAssemblyFromAnnouncements(kioskData?: KioskData | null): AssemblyAPIData | null {
  if (!kioskData?.announcements || kioskData.announcements.length === 0) return null;

  // Find assembly-type announcement with end_date >= today and title/description indicating συνέλευση
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const assemblyAnnouncements = kioskData.announcements.filter((a) => {
    const t = (a.title || '').toLowerCase();
    const d = (a.description || '').toLowerCase();
    const isAssembly = t.includes('συνέλευση') || t.includes('σύγκληση') || d.includes('συνέλευση') || d.includes('σύγκληση');
    if (!isAssembly) return false;
    if (!a.end_date) return false;
    const end = new Date(a.end_date);
    end.setHours(0, 0, 0, 0);
    return end.getTime() >= today.getTime();
  });

  if (assemblyAnnouncements.length === 0) return null;

  // Pick the soonest (by end_date)
  assemblyAnnouncements.sort((a, b) => {
    const da = new Date(a.end_date || '');
    const db = new Date(b.end_date || '');
    return da.getTime() - db.getTime();
  });

  const chosen = assemblyAnnouncements[0];

  // Try to extract date/time from description
  const extract = (label: string): string | null => {
    const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n*]+)`, 'i');
    const match = chosen.description?.match(regex);
    return match ? match[1].trim() : null;
  };

  const dateStr = extract('Ημερομηνία και Ώρα Συνέλευσης') || chosen.end_date || chosen.start_date || '';
  const timeMatch = (dateStr.match(/(\d{1,2}:\d{2})/) || [null, null])[1];
  const dateOnly = (dateStr.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/) || [null, null])[1];

  let scheduledDateISO = chosen.end_date || chosen.start_date || '';
  if (dateOnly) {
    const [d, m, y] = dateOnly.split('/').map((v) => parseInt(v, 10));
    const year = y < 100 ? 2000 + y : y;
    const dt = new Date(year, m - 1, d);
    scheduledDateISO = dt.toISOString().split('T')[0];
  }

  const scheduled_time = timeMatch || '20:00';

  return {
    id: `announcement-${chosen.id}`,
    title: chosen.title || 'Γενική Συνέλευση',
    scheduled_date: scheduledDateISO,
    scheduled_time,
    location: extract('Τοποθεσία') || undefined,
    status: 'scheduled',
    is_pre_voting_active: chosen.description?.toLowerCase().includes('pre-voting') || false,
    agenda_items: [],
  };
}

// Compact Assembly Reminder - Gets data from public-info (data prop)
// ONLY shows on the day of the assembly
const CompactAssemblyBanner = ({ buildingId, kioskData }: { buildingId?: number | null; kioskData?: KioskData | null }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get assembly from public-info data (no separate API call needed!)
  const rawAssemblyFromApi = kioskData?.upcoming_assembly as AssemblyAPIData | null;
  const rawAssembly = rawAssemblyFromApi || deriveAssemblyFromAnnouncements(kioskData);

  // Check if assembly is today
  const assembly = useMemo(() => {
    if (!rawAssembly) return null;
    
    const assemblyDate = new Date(rawAssembly.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    assemblyDate.setHours(0, 0, 0, 0);
    
    // Only show if assembly is today
    if (assemblyDate.getTime() === today.getTime()) {
      console.log('[CompactAssemblyBanner] Showing assembly for TODAY:', rawAssembly.title);
      return rawAssembly;
    }
    
    console.log('[CompactAssemblyBanner] Assembly not today, hiding. Date:', rawAssembly.scheduled_date);
    return null;
  }, [rawAssembly]);

  // Update every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Debug log
  useEffect(() => {
    console.log('[CompactAssemblyBanner] kioskData has upcoming_assembly:', !!kioskData?.upcoming_assembly);
    if (!kioskData?.upcoming_assembly) {
      console.log('[CompactAssemblyBanner] fallback to announcements? ->', !!deriveAssemblyFromAnnouncements(kioskData));
    }
  }, [kioskData]);

  // If no assembly today, don't show anything
  if (!assembly) return null;

  // Parse assembly date and time
  let assemblyDateTime = new Date(assembly.scheduled_date);
  if (assembly.scheduled_time) {
    const [hours, minutes] = assembly.scheduled_time.split(':').map(Number);
    assemblyDateTime.setHours(hours, minutes, 0, 0);
  }
  
  const location = assembly.location;
  const hasVotingItems = assembly.agenda_items?.some(item => item.item_type === 'voting') || false;
  const isPreVotingActive = assembly.is_pre_voting_active || false;
  
  // Calculate time remaining
  const diffMs = assemblyDateTime.getTime() - currentTime.getTime();
  const isPast = diffMs < 0;
  const isHappeningNow = isPast && diffMs > -3 * 60 * 60 * 1000; // Within last 3 hours
  const isInProgress = assembly.status === 'in_progress';
  
  // If assembly was more than 3 hours ago and not in progress, don't show
  if (isPast && !isHappeningNow && !isInProgress) return null;
  
  // Calculate countdown components
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="absolute top-6 right-6 z-30 max-w-[420px] animate-in fade-in slide-in-from-top-4 duration-1000">
      <div className="relative bg-gradient-to-br from-orange-600/95 via-amber-600/95 to-red-600/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Animated pulse ring for urgency */}
        <div className="absolute inset-0 rounded-2xl animate-pulse ring-2 ring-orange-400/50" />
        
        {/* Header - ΥΠΕΝΘΥΜΙΣΗ */}
        <div className="relative px-4 py-2.5 flex items-center gap-2 bg-gradient-to-r from-orange-500/40 to-amber-500/40 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-sm uppercase tracking-wider">
              ⚠️ Υπενθύμιση
            </span>
          </div>
          <span className="ml-auto px-3 py-1 bg-white/25 rounded-full text-[11px] text-white font-bold uppercase tracking-wide">
            ΣΗΜΕΡΑ
          </span>
        </div>
        
        {/* Content */}
        <div className="relative px-4 py-4 space-y-4">
          {/* Title */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Users className="w-5 h-5 text-orange-200" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-base leading-tight">
                {assembly.title || 'Γενική Συνέλευση'}
              </h3>
              {/* Status badge */}
              {(isHappeningNow || isInProgress) ? (
                <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 bg-indigo-500/25 rounded-full text-[11px] text-indigo-100 font-semibold">
                  <span className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse" />
                  Σε Εξέλιξη
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-amber-500/30 rounded-full text-[11px] text-amber-100 font-medium">
                  <Clock className="w-3 h-3" />
                  Εκκρεμεί
                </span>
              )}
            </div>
          </div>

          {/* Countdown - only if not in progress */}
          {!(isHappeningNow || isInProgress) && (
            <div className="bg-black/20 rounded-xl p-3 border border-white/10">
              <p className="text-orange-200 text-[10px] mb-2 uppercase tracking-widest text-center font-medium">
                Αντίστροφη Μέτρηση
              </p>
              <div className="flex items-center justify-center gap-1.5">
                {hours > 0 && (
                  <>
                    <div className="bg-white/15 rounded-lg px-3 py-2 min-w-[52px] text-center">
                      <span className="text-2xl font-bold text-white tabular-nums">{String(hours).padStart(2, '0')}</span>
                      <p className="text-[9px] text-orange-200 uppercase mt-0.5">Ώρες</p>
                    </div>
                    <span className="text-white/40 text-xl font-light">:</span>
                  </>
                )}
                <div className="bg-white/15 rounded-lg px-3 py-2 min-w-[52px] text-center">
                  <span className="text-2xl font-bold text-white tabular-nums">{String(minutes).padStart(2, '0')}</span>
                  <p className="text-[9px] text-orange-200 uppercase mt-0.5">Λεπτά</p>
                </div>
                <span className="text-white/40 text-xl font-light">:</span>
                <div className="bg-white/15 rounded-lg px-3 py-2 min-w-[52px] text-center">
                  <span className="text-2xl font-bold text-white tabular-nums">{String(seconds).padStart(2, '0')}</span>
                  <p className="text-[9px] text-orange-200 uppercase mt-0.5">Δεύτ.</p>
                </div>
              </div>
            </div>
          )}

          {/* Time & Location - Grid layout */}
          <div className="grid grid-cols-2 gap-2">
            {assembly.scheduled_time && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-sm">
                <Clock className="w-4 h-4 text-orange-200" />
                <span className="text-white font-medium">{assembly.scheduled_time.slice(0, 5)}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-sm">
                <MapPin className="w-4 h-4 text-orange-200 flex-shrink-0" />
                <span className="text-white font-medium truncate">{location}</span>
              </div>
            )}
          </div>

          {/* E-Voting Notice */}
          {(hasVotingItems || isPreVotingActive) && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-400/25">
              <Smartphone className="w-4 h-4 text-indigo-200 flex-shrink-0" />
              <span className="text-sm text-indigo-100 font-medium">
                Ψηφίστε ηλεκτρονικά μέσω της εφαρμογής!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Compact QR Code component for sidebar
const CompactQRCode = ({
  buildingId,
  accentColor = '#93c5fd',
}: {
  buildingId?: number | null;
  accentColor?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const QR_SIZE = 100;

  useEffect(() => {
    if (canvasRef.current && buildingId) {
      const token = btoa(`${buildingId}-${Date.now()}`).substring(0, 32);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${baseUrl}/kiosk/connect?building=${buildingId}&token=${token}`;

      QRCodeLib.toCanvas(
        canvasRef.current,
        url,
        {
          width: QR_SIZE,
          margin: 1,
          color: {
            dark: '#1d4ed8', // blue-700 (match Morning Overview palette)
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        },
        (err) => {
          if (err) console.error('QR Code generation error:', err);
        }
      );
    }
  }, [buildingId]);

  return (
    <div
      className="bg-white rounded-xl p-2 shadow-xl border"
      style={{ borderColor: accentColor }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: QR_SIZE, height: QR_SIZE, imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default function AmbientShowcaseScene({ data, buildingId, brandingConfig }: AmbientShowcaseSceneProps) {
  const [now, setNow] = useState(new Date());
  const [paletteHour, setPaletteHour] = useState(() => new Date().getHours());
  
  // Fetch weather data
  const { weather: weatherData } = useKioskWeather(300000); // Refresh every 5 minutes

  useEffect(() => {
    const timeInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setPaletteHour(new Date().getHours()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const palette = useMemo(() => getScenePalette(paletteHour), [paletteHour]);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(0);

  const branding = useMemo(
    () => resolveAmbientBranding(data, brandingConfig),
    [data, brandingConfig]
  );

  const backgroundImage = branding.background?.type === 'image' ? branding.background?.src : undefined;
  const backgroundGradient = branding.background?.type === 'gradient'
    ? branding.background?.gradient
    : 'radial-gradient(circle at 20% 20%, rgba(45, 212, 191, 0.25), transparent 55%), radial-gradient(circle at 80% 10%, rgba(99, 102, 241, 0.22), transparent 55%), linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%)';
  const backgroundVideo = useMemo(() => pickAmbientVideo(weatherData, now), [weatherData, now]);

  const dateInfo = formatGreekDate(now);
  const formattedTime = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  const temperature = extractTemperature(weatherData);
  const weatherCondition = extractWeatherCondition(weatherData);
  const greeting = now.getHours() < 12 ? 'Καλημέρα' : now.getHours() < 18 ? 'Καλή συνέχεια' : 'Καλησπέρα';
  const effectiveBuildingId = buildingId ?? data?.building_info?.id;

  // Measure sidebar width so footer ticker does NOT cover it.
  useEffect(() => {
    if (!sidebarRef.current) return;
    const el = sidebarRef.current;
    const ro = new ResizeObserver(() => {
      setSidebarWidth(el.getBoundingClientRect().width);
    });
    ro.observe(el);
    // initial
    setSidebarWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white pb-20">
      {/* Full-screen Background (Video preferred, Image fallback) */}
      <div className="absolute inset-0">
        {backgroundVideo ? (
          <video
            key={backgroundVideo}
            className="h-full w-full object-cover"
            src={backgroundVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={backgroundImage}
          />
        ) : backgroundImage ? (
          <img 
            src={backgroundImage} 
            alt="" 
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full" style={{ backgroundImage: backgroundGradient }} />
        )}
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: palette.overlay }} />
        {/* Darken left side behind widgets for readability */}
        <div className="absolute inset-y-0 left-0 w-[25%] bg-gradient-to-r from-slate-950/85 via-slate-900/55 to-transparent" />
      </div>

      {/* Assembly Reminder Banner - Top Right (only shows on assembly day) */}
      <CompactAssemblyBanner buildingId={effectiveBuildingId} kioskData={data} />
      
      {/* Active Vote Widget - Shows when there's an ongoing vote (bottom right) */}
      <ActiveVoteWidget data={data} variant="ambient" />

      {/* Sidebar - Match Morning Overview widget surfaces */}
      <aside
        ref={(node) => {
          sidebarRef.current = node;
        }}
        className="absolute inset-y-0 left-0 w-[17%] min-w-[240px] max-w-[300px] flex flex-col backdrop-blur-2xl border-r shadow-2xl"
        style={{ backgroundColor: palette.sidebarSurface, borderColor: palette.accentBorder }}
      >
        
        {/* Header with greeting */}
        <div className="px-5 pt-6 pb-4">
          <p className="text-indigo-200 text-lg font-medium tracking-wide">{greeting}</p>
          <p className="text-white/60 text-xs mt-0.5">
            {data?.building_info?.name || 'Καλώς ήρθατε'}
          </p>
        </div>

        {/* Time & Date Section */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2 text-indigo-200/80 text-[11px] uppercase tracking-[0.12em] mb-3">
            <Clock className="h-3.5 w-3.5" />
            <span>Ώρα & Ημερομηνία</span>
          </div>
          <p className="text-[2.2rem] font-light tabular-nums leading-none text-white tracking-tight">
            {formattedTime}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm text-indigo-100/80">
            <span className="font-medium capitalize">{dateInfo.weekday}</span>
            <span className="text-indigo-200/40">|</span>
            <span>{dateInfo.day} {dateInfo.month}</span>
          </div>
        </div>

        {/* Weather Section */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2 text-indigo-200/80 text-[11px] uppercase tracking-[0.12em] mb-3">
            <CloudSun className="h-3.5 w-3.5" />
            <span>Καιρός</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg border border-white/10">
              <Thermometer className="h-5 w-5 text-indigo-200" />
            </div>
            <div>
              <span className="text-2xl font-light text-white">
                {temperature !== null ? `${temperature}°C` : '—°C'}
              </span>
              {weatherCondition && (
                <p className="text-sm text-indigo-200/70 mt-0.5">{weatherCondition}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-indigo-200/50 mt-2">
            📍 {data?.building_info?.city || 'Αθήνα, Ελλάδα'}
          </p>
        </div>

        {/* Building Info */}
        {data?.building_info?.name && (
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-indigo-200/80 text-[11px] uppercase tracking-[0.12em] mb-2">
              <Building2 className="h-3.5 w-3.5" />
              <span>Κτίριο</span>
            </div>
            <p className="text-base font-medium text-white leading-snug">
              {data.building_info.name}
            </p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Optional banner ad (if available) */}
        {Array.isArray((data as any)?.ads?.banner) && (data as any).ads.banner.length > 0 ? (
          <div className="px-5 pb-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <AdBannerWidget data={data} isLoading={false} error={undefined} />
            </div>
          </div>
        ) : null}

        {/* App Promo Section */}
        <div className="px-5 py-5 border-t border-white/10">
          <div className="flex items-center gap-2 text-indigo-200/80 text-[11px] uppercase tracking-[0.12em] mb-4">
            <Smartphone className="h-3.5 w-3.5" />
            <span>Εφαρμογή</span>
          </div>
          
          {/* QR Code centered */}
          <div className="flex flex-col items-center gap-3">
            <CompactQRCode buildingId={effectiveBuildingId} accentColor={palette.accentBorder} />
            <div className="text-center">
              <p className="text-sm font-semibold text-white">New Concierge</p>
              <p className="text-xs text-indigo-200/70 mt-1">Σκανάρετε για σύνδεση</p>
            </div>
          </div>

          {/* App Features */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-indigo-100/80">
              <Check className="h-3.5 w-3.5 text-indigo-300" />
              <span>Ειδοποιήσεις real-time</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-100/80">
              <Check className="h-3.5 w-3.5 text-indigo-300" />
              <span>Πληρωμές κοινοχρήστων</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-100/80">
              <Check className="h-3.5 w-3.5 text-indigo-300" />
              <span>Αιτήματα συντήρησης</span>
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="px-5 py-3 border-t border-white/10">
          <p className="text-[0.6rem] text-indigo-200/40 text-center tracking-wider uppercase">
            Powered by New Concierge
          </p>
        </div>
      </aside>

      {/* News Widget Footer - match Morning Overview */}
      <div
        className="fixed bottom-4 h-20 backdrop-blur-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl z-50 overflow-hidden"
        style={{
          backgroundColor: palette.tickerSurface,
          borderColor: palette.accentBorder,
          left: `${Math.max(20, sidebarWidth + 20)}px`,
          right: '20px',
        }}
      >
        <div className="h-full px-8">
          <NewsWidget data={data} isLoading={false} error={undefined} />
        </div>
      </div>

      <div className="fixed bottom-0.5 left-0 right-0 h-3 flex items-center justify-center z-40">
        <p className="text-[9px] text-indigo-200/50 font-normal tracking-wide">
          © {new Date().getFullYear()} New Concierge. All rights reserved.
        </p>
      </div>

      {/* Whole-page interstitial ad (low frequency) */}
      <AdInterstitialOverlay data={data} isLoading={false} error={undefined} />
    </div>
  );
}
