'use client';

import KioskTopBar from '@/components/KioskTopBar';

export default function TestKioskPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <KioskTopBar />
      <div className="p-8 text-white">
        <h1 className="text-2xl font-bold mb-4">Test Kiosk Top Bar</h1>
        <p>This page tests the new KioskTopBar component with weather widget and advertisement banners.</p>
        <div className="mt-8 p-4 bg-white/10 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Features:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Weather widget with real-time data from Open-Meteo API</li>
            <li>2 rotating advertisement banners</li>
            <li>Automatic banner rotation every 8 seconds</li>
            <li>Manual banner navigation with dots</li>
            <li>Responsive design with backdrop blur effects</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 