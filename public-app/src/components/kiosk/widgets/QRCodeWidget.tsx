'use client';

import { useState, useEffect, useRef } from 'react';
import { BaseWidgetProps } from '@/types/kiosk';
import { QrCode, Smartphone, Building2 } from 'lucide-react';
import QRCodeLib from 'qrcode';

const QR_DIMENSION = 120;

export default function QRCodeWidget({ data, isLoading, error }: BaseWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string>('');

  // Generate QR code URL and token
  useEffect(() => {
    const generateQRUrl = async () => {
      try {
        const buildingId = data?.building_info?.id || 1;
        let token: string | null = null;

        try {
          const response = await fetch('/api/kiosk/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ building_id: buildingId }),
          });

          if (response.ok) {
            const payload = await response.json();
            token = payload?.token ?? null;
          } else {
            const errorPayload = await response.json().catch(() => ({}));
            if (errorPayload?.code === 'KIOSK_SIGNED_QR_DISABLED') {
              // Legacy fallback when signed QR is disabled
              token = btoa(`${buildingId}-${Date.now()}`).substring(0, 32);
            } else {
              throw new Error(errorPayload?.error || 'Αποτυχία δημιουργίας QR token');
            }
          }
        } catch (err) {
          console.error('Error fetching kiosk token:', err);
          setQrError('Σφάλμα δημιουργίας QR token');
          return;
        }

        if (!token) {
          setQrError('Σφάλμα δημιουργίας QR token');
          return;
        }

        // Construct the URL
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/kiosk/connect?building=${buildingId}&token=${encodeURIComponent(token)}`;

        setQrUrl(url);

        // Generate QR code on canvas
        if (canvasRef.current) {
          QRCodeLib.toCanvas(
            canvasRef.current,
            url,
            {
              width: QR_DIMENSION,
              margin: 1,
              color: {
                dark: '#1e293b',  // slate-800
                light: '#ffffff'
              },
              errorCorrectionLevel: 'H'
            },
            (err) => {
              if (err) {
                console.error('QR Code generation error:', err);
                setQrError('Σφάλμα δημιουργίας QR code');
              }
            }
          );
        }
      } catch (err) {
        console.error('Error generating QR URL:', err);
        setQrError('Σφάλμα δημιουργίας QR code');
      }
    };

    if (data?.building_info) {
      generateQRUrl();
    }
  }, [data?.building_info]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error || qrError) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error || qrError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-3">

      {/* QR Code */}
      <div className="mb-4 w-full flex justify-center">
        <div className="bg-white rounded-2xl p-3 shadow-2xl border-2 border-blue-400/30">
          <canvas
            ref={canvasRef}
            className="block mx-auto"
            style={{ imageRendering: 'pixelated', width: QR_DIMENSION, height: QR_DIMENSION }}
          />
        </div>
      </div>

      {/* Building Info */}
      {data?.building_info && (
        <div className="flex items-center gap-2 mb-3 bg-blue-500/10 border border-blue-400/30 rounded-lg px-3 py-2">
          <Building2 className="w-4 h-4 text-blue-300" />
          <span className="text-sm font-semibold text-blue-200">
            {data.building_info.name || `Κτίριο #${data.building_info.id}`}
          </span>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/40 rounded-xl p-4 max-w-xs">
        <div className="flex items-start gap-3 mb-3">
          <Smartphone className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="text-sm font-semibold text-blue-100 mb-1">
              Σκάναρε για άμεση σύνδεση
            </p>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              Με το κινητό σου: κάμερα ➜ QR. Πρόσβαση σε ανακοινώσεις, αιτήματα και κοινόχρηστα.
            </p>
          </div>
        </div>

        <div className="text-xs text-blue-200/60 leading-relaxed border-t border-blue-400/20 pt-3">
          <p>✓ 10ʺ για σύνδεση στο κτίριο</p>
          <p>✓ Χωρίς εγκατάσταση</p>
          <p>✓ Δήλωση βλάβης & ενημερώσεις</p>
        </div>
      </div>

      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && qrUrl && (
        <div className="mt-4 text-[10px] text-white/30 font-mono break-all max-w-xs">
          {qrUrl}
        </div>
      )}
    </div>
  );
}
