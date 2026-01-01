'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Sparkles, ArrowUpRight, Smartphone } from 'lucide-react';
import QRCodeLib from 'qrcode';

interface AppSpotlightCardProps {
  buildingId?: number | null;
  buildingName?: string;
  tagline?: string;
  helperText?: string;
  ctaLabel?: string;
  ctaSubtitle?: string;
  fallbackUrl?: string;
}

const buildShareUrl = (buildingId?: number | null, fallbackUrl?: string) => {
  if (fallbackUrl) {
    return fallbackUrl;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const baseUrl = window.location.origin;
  const resolvedBuilding = buildingId ?? 1;
  const token = btoa(`${resolvedBuilding}-${new Date().getTime()}`).slice(0, 28);
  return `${baseUrl}/kiosk/connect?building=${resolvedBuilding}&token=${token}`;
};

export default function AppSpotlightCard({
  buildingId,
  buildingName,
  tagline = 'New Concierge App',
  helperText = 'Η πιο ανθρώπινη πλατφόρμα διαχείρισης πολυκατοικιών',
  ctaLabel = 'Ζήσε το demo',
  ctaSubtitle = 'Σκανάρετε για πρόσβαση',
  fallbackUrl,
}: AppSpotlightCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shareUrl = useMemo(() => buildShareUrl(buildingId, fallbackUrl), [buildingId, fallbackUrl]);

  useEffect(() => {
    if (!canvasRef.current || !shareUrl) return;
    QRCodeLib.toCanvas(
      canvasRef.current,
      shareUrl,
      {
        width: 144,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err) => {
        if (err) {
          console.error('[AppSpotlightCard] QR generation error', err);
        }
      }
    );
  }, [shareUrl]);

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-white/25 bg-white/5 p-5 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/10 p-2.5">
          <Sparkles className="h-5 w-5 text-amber-200" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">New Concierge</p>
          <h3 className="text-2xl font-semibold leading-snug">{tagline}</h3>
          <p className="mt-2 text-sm text-white/70">{helperText}</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Smartphone className="h-4 w-4 text-white/60" />
            <span>{buildingName || 'Κτίριο New Concierge'}</span>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
            <p className="text-sm font-medium text-white/90">{ctaLabel}</p>
            <div className="mt-1 flex items-center gap-1 text-xs uppercase tracking-wider text-white/60">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {ctaSubtitle}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-2 shadow-xl">
          <canvas ref={canvasRef} className="block h-36 w-36" />
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">
        Η έξυπνη διαχείριση ξεκινά από εδώ
      </div>
    </div>
  );
}
