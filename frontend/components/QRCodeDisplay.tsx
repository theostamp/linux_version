'use client';

import React from 'react';
import { QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  buildingId: number;
  buildingName: string;
  size?: number;
}

export default function QRCodeDisplay({ buildingId, buildingName, size = 128 }: QRCodeDisplayProps) {
  const connectUrl = `${window.location.origin}/connect?building=${buildingId}`;
  
  // Use a QR code generation service
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(connectUrl)}&format=png&margin=2&color=000000&bgcolor=FFFFFF`;

  return (
    <div className="text-center">
      <div className="inline-block p-3 bg-white rounded-lg">
        <img 
          src={qrCodeUrl}
          alt={`QR Code for ${buildingName}`}
          className="w-32 h-32"
          style={{ width: size, height: size }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-600">
        <p className="font-medium">{buildingName}</p>
        <p className="text-gray-500">Σκανάρετε για σύνδεση</p>
      </div>
    </div>
  );
} 