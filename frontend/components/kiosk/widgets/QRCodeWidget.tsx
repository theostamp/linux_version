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
        <div className="text-xs text-gray-300">
          QR Code για σύνδεση
        </div>
      </div>

      {/* Connection Info */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-white">
          <Smartphone className="w-4 h-4 text-blue-300" />
          <span>Συνδέστε το κινητό σας</span>
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-gray-300">
          <Wifi className="w-3 h-3 text-green-300" />
          <span>Δωρεάν WiFi διαθέσιμο</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-400 leading-relaxed">
        <p>1. Σκανάρετε τον QR κώδικα</p>
        <p>2. Ανοίξτε το link στο κινητό</p>
        <p>3. Αποκτήστε πρόσβαση στο σύστημα</p>
      </div>

      {/* Building Info */}
      {data?.building_info && (
        <div className="mt-4 p-2 bg-blue-900/30 rounded-lg">
          <div className="text-xs text-blue-200">
            Κτίριο: {data.building_info.name || 'Αλκμάνος 22'}
          </div>
          <div className="text-xs text-gray-400">
            ID: {data.building_info.id}
          </div>
        </div>
      )}
    </div>
  );
}
