'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { QrCode, Smartphone, Wifi } from 'lucide-react';

export default function QRCodeWidget({ data, isLoading, error }: BaseWidgetProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const qrCodeData = {
    url: window.location.origin,
    buildingId: data?.building_info?.id || 1,
    timestamp: Date.now()
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4">
      {/* QR Code Placeholder */}
      <div className="mb-4">
        <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center mb-3">
          <QrCode className="w-16 h-16 text-gray-800" />
        </div>
      </div>

      {/* Info Text */}
      <div className="bg-blue-500/20 border border-blue-400/40 rounded-lg p-3">
        <div className="text-xs text-blue-200 leading-relaxed">
          <p className="font-medium">Μπορείτε να δείτε την αναλυτική κατάσταση στο email που σας έχει σταλεί ή σαρώνωντας το QR code με το κινητό σας.</p>
        </div>
      </div>
    </div>
  );
}
