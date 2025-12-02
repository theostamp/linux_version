'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Clock, Thermometer, Smartphone, Building2, CloudSun, Check } from 'lucide-react';
import type { KioskData } from '@/hooks/useKioskData';
import QRCodeLib from 'qrcode';
import {
  AmbientBrandingConfig,
  resolveAmbientBranding,
} from '@/components/kiosk/scenes/branding';

interface AmbientShowcaseSceneProps {
  data?: KioskData | null;
  buildingId?: number | null;
  brandingConfig?: Partial<AmbientBrandingConfig>;
}

// Single HD image for ambient display
const AMBIENT_IMAGE = '/kiosk/assets/visuals/14826004_1920_1080_30fpspxhere.com.jpg';

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

  useEffect(() => {
    const timeInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const branding = useMemo(
    () => resolveAmbientBranding(data, brandingConfig),
    [data, brandingConfig]
  );

  // Use branding image if available, otherwise use the HD image
  const backgroundImage = branding.background?.src || AMBIENT_IMAGE;

  const dateInfo = formatGreekDate(now);
  const formattedTime = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  const temperature = extractTemperature(data);
  const weatherCondition = extractWeatherCondition(data);
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
