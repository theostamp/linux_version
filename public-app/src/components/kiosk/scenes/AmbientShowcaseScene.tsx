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

interface AmbientShowcaseSceneProps {
  data?: KioskData | null;
  buildingId?: number | null;
  brandingConfig?: Partial<AmbientBrandingConfig>;
}

// Available ambient images - will be randomly selected
const AMBIENT_IMAGES = [
  '/kiosk/assets/visuals/14826004_1920_1080_30fpspxhere.com.jpg',
  '/kiosk/assets/visuals/kiosk1.jpg',
  // SVG files are also available but we'll focus on JPG for now
];

// Function to get a random image from the available images
const getRandomAmbientImage = (): string => {
  return AMBIENT_IMAGES[Math.floor(Math.random() * AMBIENT_IMAGES.length)];
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

// Compact Assembly Reminder - Gets data from public-info (data prop)
// ONLY shows on the day of the assembly
const CompactAssemblyBanner = ({ buildingId, kioskData }: { buildingId?: number | null; kioskData?: KioskData | null }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get assembly from public-info data (no separate API call needed!)
  const rawAssembly = kioskData?.upcoming_assembly as AssemblyAPIData | null;

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
    <div className="absolute top-4 right-4 max-w-[340px] z-20 bg-gradient-to-br from-orange-600/95 to-red-600/95 border-orange-400 backdrop-blur-xl rounded-2xl border-2 shadow-2xl overflow-hidden animate-pulse">
      {/* Header - ΥΠΕΝΘΥΜΙΣΗ */}
      <div className="px-4 py-2 flex items-center gap-2 bg-orange-500/40">
        <AlertCircle className="w-5 h-5 text-white animate-bounce" />
        <span className="text-white font-extrabold text-sm uppercase tracking-wider">
          ⚠️ Υπενθύμιση
        </span>
        <span className="ml-auto px-2 py-0.5 bg-white/25 rounded-full text-[10px] text-white font-bold uppercase">
          ΣΗΜΕΡΑ
        </span>
      </div>
      
      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-200" />
          <span className="text-white font-bold text-sm leading-tight">{assembly.title || 'Γενική Συνέλευση'}</span>
        </div>

        {/* Countdown or "Σε εξέλιξη" */}
        {isHappeningNow || isInProgress ? (
          <div className="bg-emerald-500/40 rounded-xl p-3 text-center border border-emerald-400/50">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-100 font-bold text-lg uppercase">Σε Εξέλιξη</span>
            </div>
          </div>
        ) : (
          <div className="bg-black/30 rounded-xl p-3 text-center">
            <p className="text-orange-200 text-xs mb-2 uppercase tracking-wider">Αντίστροφη Μέτρηση</p>
            <div className="flex items-center justify-center gap-2">
              {hours > 0 && (
                <>
                  <div className="bg-white/15 rounded-lg px-3 py-2 min-w-[50px]">
                    <span className="text-2xl font-bold text-white tabular-nums">{String(hours).padStart(2, '0')}</span>
                    <p className="text-[9px] text-orange-200 uppercase">Ώρες</p>
                  </div>
                  <span className="text-white/50 text-xl">:</span>
                </>
              )}
              <div className="bg-white/15 rounded-lg px-3 py-2 min-w-[50px]">
                <span className="text-2xl font-bold text-white tabular-nums">{String(minutes).padStart(2, '0')}</span>
                <p className="text-[9px] text-orange-200 uppercase">Λεπτά</p>
              </div>
              <span className="text-white/50 text-xl">:</span>
              <div className="bg-white/15 rounded-lg px-3 py-2 min-w-[50px]">
                <span className="text-2xl font-bold text-white tabular-nums">{String(seconds).padStart(2, '0')}</span>
                <p className="text-[9px] text-orange-200 uppercase">Δεύτ.</p>
              </div>
            </div>
          </div>
        )}

        {/* Time & Location */}
        <div className="flex flex-wrap gap-2 text-xs">
          {assembly.scheduled_time && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/30 text-orange-100">
              <Clock className="w-3 h-3" />
              <span>Ώρα: {assembly.scheduled_time.slice(0, 5)}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/30 text-orange-100 max-w-full">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        {/* E-Voting Notice */}
        {(hasVotingItems || isPreVotingActive) && (
          <div className="pt-2 border-t border-orange-400/30">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs bg-emerald-500/30 text-emerald-100">
              <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="leading-tight">
                Μπορείτε να ψηφίσετε ηλεκτρονικά μέσω της εφαρμογής!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Compact QR Code component for sidebar
const CompactQRCode = ({ buildingId }: { buildingId?: number | null }) => {
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
            dark: '#0f766e', // teal-700
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
    <div className="bg-white rounded-xl p-2 shadow-xl ring-2 ring-teal-400/30">
      <canvas
        ref={canvasRef}
        style={{ width: QR_SIZE, height: QR_SIZE, imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default function AmbientShowcaseScene({ data, buildingId, brandingConfig }: AmbientShowcaseSceneProps) {
  const [now, setNow] = useState(new Date());
  const [randomImage] = useState(() => getRandomAmbientImage()); // Random image selected once on mount
  
  // Fetch weather data
  const { weather: weatherData } = useKioskWeather(300000); // Refresh every 5 minutes

  useEffect(() => {
    const timeInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const branding = useMemo(
    () => resolveAmbientBranding(data, brandingConfig),
    [data, brandingConfig]
  );

  // Use branding image if available, otherwise use random ambient image
  const backgroundImage = branding.background?.src || randomImage;

  const dateInfo = formatGreekDate(now);
  const formattedTime = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  const temperature = extractTemperature(weatherData);
  const weatherCondition = extractWeatherCondition(weatherData);
  const greeting = now.getHours() < 12 ? 'Καλημέρα' : now.getHours() < 18 ? 'Καλή συνέχεια' : 'Καλησπέρα';
  const effectiveBuildingId = buildingId ?? data?.building_info?.id;

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white">
      {/* Full-screen Background Image */}
      <div className="absolute inset-0">
        <img 
          src={backgroundImage} 
          alt="" 
          className="h-full w-full object-cover"
        />
        {/* Gradient overlay for sidebar area */}
        <div className="absolute inset-y-0 left-0 w-[25%] bg-gradient-to-r from-teal-900/90 via-teal-800/70 to-transparent" />
      </div>

      {/* Assembly Reminder Banner - Top Right (only shows on assembly day) */}
      <CompactAssemblyBanner buildingId={effectiveBuildingId} kioskData={data} />

      {/* Sidebar - Teal/Cyan theme with better visibility */}
      <aside className="absolute inset-y-0 left-0 w-[17%] min-w-[240px] max-w-[300px] flex flex-col bg-gradient-to-b from-teal-800/95 via-teal-900/95 to-cyan-900/95 backdrop-blur-xl border-r border-teal-400/20 shadow-2xl">
        
        {/* Header with greeting */}
        <div className="px-5 pt-6 pb-4 bg-gradient-to-b from-teal-700/50 to-transparent">
          <p className="text-teal-200 text-lg font-medium tracking-wide">{greeting}</p>
          <p className="text-white/60 text-xs mt-0.5">
            {data?.building_info?.name || 'Καλώς ήρθατε'}
          </p>
        </div>

        {/* Time & Date Section */}
        <div className="px-5 py-5 border-b border-teal-400/20">
          <div className="flex items-center gap-2 text-teal-300/80 text-[0.65rem] uppercase tracking-[0.3em] mb-3">
            <Clock className="h-3.5 w-3.5" />
            <span>Ώρα & Ημερομηνία</span>
          </div>
          <p className="text-[2.2rem] font-light tabular-nums leading-none text-white tracking-tight">
            {formattedTime}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm text-teal-100/80">
            <span className="font-medium capitalize">{dateInfo.weekday}</span>
            <span className="text-teal-400/50">|</span>
            <span>{dateInfo.day} {dateInfo.month}</span>
          </div>
        </div>

        {/* Weather Section */}
        <div className="px-5 py-5 border-b border-teal-400/20">
          <div className="flex items-center gap-2 text-teal-300/80 text-[0.65rem] uppercase tracking-[0.3em] mb-3">
            <CloudSun className="h-3.5 w-3.5" />
            <span>Καιρός</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-700/40 rounded-lg">
              <Thermometer className="h-5 w-5 text-teal-200" />
            </div>
            <div>
              <span className="text-2xl font-light text-white">
                {temperature !== null ? `${temperature}°C` : '—°C'}
              </span>
              {weatherCondition && (
                <p className="text-sm text-teal-200/70 mt-0.5">{weatherCondition}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-teal-300/50 mt-2">
            📍 {data?.building_info?.city || 'Αθήνα, Ελλάδα'}
          </p>
        </div>

        {/* Building Info */}
        {data?.building_info?.name && (
          <div className="px-5 py-4 border-b border-teal-400/20">
            <div className="flex items-center gap-2 text-teal-300/80 text-[0.65rem] uppercase tracking-[0.3em] mb-2">
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

        {/* App Promo Section */}
        <div className="px-5 py-5 bg-gradient-to-t from-cyan-900/60 to-transparent border-t border-teal-400/20">
          <div className="flex items-center gap-2 text-teal-300/80 text-[0.65rem] uppercase tracking-[0.3em] mb-4">
            <Smartphone className="h-3.5 w-3.5" />
            <span>Εφαρμογή</span>
          </div>
          
          {/* QR Code centered */}
          <div className="flex flex-col items-center gap-3">
            <CompactQRCode buildingId={effectiveBuildingId} />
            <div className="text-center">
              <p className="text-sm font-semibold text-white">New Concierge</p>
              <p className="text-xs text-teal-200/70 mt-1">Σκανάρετε για σύνδεση</p>
            </div>
          </div>

          {/* App Features */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-teal-100/80">
              <Check className="h-3.5 w-3.5 text-teal-400" />
              <span>Ειδοποιήσεις real-time</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-teal-100/80">
              <Check className="h-3.5 w-3.5 text-teal-400" />
              <span>Πληρωμές κοινοχρήστων</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-teal-100/80">
              <Check className="h-3.5 w-3.5 text-teal-400" />
              <span>Αιτήματα συντήρησης</span>
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="px-5 py-3 bg-teal-950/80 border-t border-teal-400/10">
          <p className="text-[0.6rem] text-teal-300/50 text-center tracking-wider uppercase">
            Powered by New Concierge
          </p>
        </div>
      </aside>

      {/* Copyright - subtle bottom right */}
      <div className="absolute bottom-2 right-4 z-10">
        <p className="text-[0.55rem] text-white/40 tracking-wide">
          © {new Date().getFullYear()} New Concierge
        </p>
      </div>
    </div>
  );
}
