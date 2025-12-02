'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Clock, Thermometer, Smartphone, QrCode, Building2, CloudSun, ChevronRight } from 'lucide-react';
import type { KioskData } from '@/hooks/useKioskData';
import QRCodeLib from 'qrcode';
import {
  AmbientBrandingConfig,
  AmbientBackgroundConfig,
  resolveAmbientBranding,
} from '@/components/kiosk/scenes/branding';

interface AmbientShowcaseSceneProps {
  data?: KioskData | null;
  buildingId?: number | null;
  brandingConfig?: Partial<AmbientBrandingConfig>;
}

type VisualAsset = {
  id: string;
  title?: string;
  src: string;
  type: 'image' | 'video';
  poster?: string;
};

// HD visual library - high quality images for ambient display
const HD_VISUAL_LIBRARY: VisualAsset[] = [
  {
    id: 'city-aerial',
    title: 'City View',
    src: '/kiosk/assets/visuals/14826004_1920_1080_30fpspxhere.com.jpg',
    type: 'image',
  },
  {
    id: 'aurora',
    src: '/kiosk/assets/visuals/aurora-drift.svg',
    type: 'image',
  },
  {
    id: 'sunset',
    src: '/kiosk/assets/visuals/sunset-haze.svg',
    type: 'image',
  },
  {
    id: 'ocean',
    src: '/kiosk/assets/visuals/calm-waves.svg',
    type: 'image',
  },
];

const formatGreekDate = (date: Date) => ({
  day: date.toLocaleDateString('el-GR', { day: '2-digit' }),
  month: date.toLocaleDateString('el-GR', { month: 'long' }),
  weekday: date.toLocaleDateString('el-GR', { weekday: 'long' }),
  year: date.getFullYear(),
});

const extractTemperature = (data?: KioskData | null): number | null => {
  const weather = (data as any)?.weather;
  const candidates = [
    weather?.current?.temperature,
    weather?.current?.temp,
    weather?.current?.temp_c,
    weather?.temperature,
    weather?.temp,
  ].filter((value) => typeof value === 'number');

  if (candidates.length) {
    return Math.round(candidates[0] as number);
  }

  return null;
};

const extractWeatherCondition = (data?: KioskData | null): string | null => {
  const weather = (data as any)?.weather;
  return weather?.current?.condition?.text || weather?.condition || null;
};

// Compact QR Code component for sidebar
const CompactQRCode = ({ buildingId }: { buildingId?: number | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const QR_SIZE = 90;

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
            dark: '#1e293b',
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
    <div className="bg-white rounded-lg p-1.5 shadow-lg">
      <canvas
        ref={canvasRef}
        style={{ width: QR_SIZE, height: QR_SIZE, imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default function AmbientShowcaseScene({ data, buildingId, brandingConfig }: AmbientShowcaseSceneProps) {
  const [now, setNow] = useState(new Date());
  const [visualIndex, setVisualIndex] = useState(0);

  useEffect(() => {
    const timeInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const branding = useMemo(
    () => resolveAmbientBranding(data, brandingConfig),
    [data, brandingConfig]
  );

  const visualPlaylist = useMemo(() => {
    const derived: VisualAsset[] = [];
    if (branding.background?.src) {
      derived.push({
        id: 'branding-source',
        src: branding.background.src,
        type: branding.background.type === 'video' ? 'video' : 'image',
        poster: branding.background.poster,
      });
    }
    return [...derived, ...HD_VISUAL_LIBRARY];
  }, [branding.background]);

  useEffect(() => {
    setVisualIndex(0);
  }, [visualPlaylist.length]);

  useEffect(() => {
    if (visualPlaylist.length <= 1) return;
    const interval = setInterval(() => {
      setVisualIndex((prev) => (prev + 1) % visualPlaylist.length);
    }, 20000); // 20 seconds per visual
    return () => clearInterval(interval);
  }, [visualPlaylist.length]);

  const currentVisual = visualPlaylist[visualIndex] ?? HD_VISUAL_LIBRARY[0];
  const dateInfo = formatGreekDate(now);
  const formattedTime = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  const temperature = extractTemperature(data);
  const weatherCondition = extractWeatherCondition(data);
  const greeting = now.getHours() < 12 ? 'Καλημέρα' : now.getHours() < 18 ? 'Καλή συνέχεια' : 'Καλησπέρα';
  const effectiveBuildingId = buildingId ?? data?.building_info?.id;

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white">
      {/* Full-screen Background Visual (80-85%) */}
      <div className="absolute inset-0">
        {visualPlaylist.map((visual, index) => (
          <div
            key={visual.id + index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === visualIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {visual.type === 'video' ? (
              <video
                className="h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture
                preload="auto"
                poster={visual.poster}
              >
                <source src={visual.src} />
              </video>
            ) : (
              <img src={visual.src} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        ))}
        
        {/* Subtle gradient overlay for sidebar readability */}
        <div className="absolute inset-y-0 left-0 w-[22%] bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      </div>

      {/* Sidebar - 15-18% width */}
      <aside className="absolute inset-y-0 left-0 w-[16%] min-w-[220px] max-w-[280px] flex flex-col bg-black/50 backdrop-blur-xl border-r border-white/10">
        
        {/* Time & Date Section */}
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-[0.5rem] uppercase tracking-[0.4em] text-white/60 mb-2">
            <Clock className="h-2.5 w-2.5" />
            {greeting}
          </div>
          <p className="text-[1.8rem] font-light tabular-nums leading-none tracking-tight">{formattedTime}</p>
          <div className="mt-2 text-[0.7rem] text-white/70">
            <span className="font-medium">{dateInfo.weekday}</span>
            <span className="mx-1.5 text-white/30">•</span>
            <span>{dateInfo.day} {dateInfo.month}</span>
          </div>
        </div>

        {/* Weather Section */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-[0.5rem] uppercase tracking-[0.4em] text-white/60 mb-2">
            <CloudSun className="h-2.5 w-2.5" />
            Καιρός
          </div>
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-white/70" />
            <span className="text-xl font-light">
              {temperature !== null ? `${temperature}°C` : '—°C'}
            </span>
          </div>
          {weatherCondition && (
            <p className="text-[0.65rem] text-white/60 mt-1">{weatherCondition}</p>
          )}
          <p className="text-[0.6rem] text-white/50 mt-0.5">
            {data?.building_info?.city || 'Αθήνα'}
          </p>
        </div>

        {/* Building Info */}
        {data?.building_info?.name && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-1.5 text-[0.5rem] uppercase tracking-[0.4em] text-white/60 mb-1.5">
              <Building2 className="h-2.5 w-2.5" />
              Κτίριο
            </div>
            <p className="text-[0.7rem] font-medium text-white/90 leading-snug">
              {data.building_info.name}
            </p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* App Promo Section */}
        <div className="px-4 py-4 border-t border-white/10 bg-gradient-to-t from-indigo-950/40 to-transparent">
          <div className="flex items-center gap-1.5 text-[0.5rem] uppercase tracking-[0.4em] text-white/60 mb-2">
            <Smartphone className="h-2.5 w-2.5" />
            Εφαρμογή
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <CompactQRCode buildingId={effectiveBuildingId} />
            <div className="text-center">
              <p className="text-[0.6rem] font-medium text-white/90">New Concierge</p>
              <p className="text-[0.5rem] text-white/50 mt-0.5">Σκανάρετε για σύνδεση</p>
            </div>
          </div>

          {/* App Features - compact */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-1 text-[0.5rem] text-white/60">
              <ChevronRight className="h-2 w-2" />
              <span>Ειδοποιήσεις σε πραγματικό χρόνο</span>
            </div>
            <div className="flex items-center gap-1 text-[0.5rem] text-white/60">
              <ChevronRight className="h-2 w-2" />
              <span>Πληρωμές κοινοχρήστων</span>
            </div>
            <div className="flex items-center gap-1 text-[0.5rem] text-white/60">
              <ChevronRight className="h-2 w-2" />
              <span>Αιτήματα συντήρησης</span>
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="px-4 py-2 border-t border-white/5 bg-black/30">
          <p className="text-[0.45rem] text-white/40 text-center tracking-wide">
            Powered by New Concierge
          </p>
        </div>
      </aside>

      {/* Visual indicators - bottom right */}
      {visualPlaylist.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
          {visualPlaylist.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === visualIndex 
                  ? 'w-6 bg-white/80' 
                  : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Copyright - subtle bottom center */}
      <div className="absolute bottom-1.5 left-[16%] right-0 flex justify-center z-10">
        <p className="text-[0.45rem] text-white/30 tracking-wide">
          © {new Date().getFullYear()} New Concierge
        </p>
      </div>
    </div>
  );
}
