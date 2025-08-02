'use client';

import { useState } from 'react';
import TestStreetView from '@/components/TestStreetView';
import StreetViewImage from '@/components/StreetViewImage';

export default function TestStreetViewPage() {
  const [testCoordinates, setTestCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 37.9838,
    lng: 23.7275
  });

  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  const handleImageSelect = (imageUrl: string) => {
    console.log('📸 Test page: Image selected:', imageUrl);
    setSelectedImageUrl(imageUrl);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">🧪 Street View Test Page</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Component */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Test Component</h2>
          <TestStreetView />
        </div>
        
        {/* Street View Image Component */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Street View Image Component</h2>
          <StreetViewImage
            coordinates={testCoordinates}
            address="Πανεπιστημίου 30, Αθήνα"
            onImageSelect={handleImageSelect}
          />
        </div>
      </div>
      
      {/* Selected Image Display */}
      {selectedImageUrl && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Selected Image</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 mb-2">✅ Image selected successfully!</p>
            <img 
              src={selectedImageUrl} 
              alt="Selected Street View" 
              className="w-full max-w-md border border-gray-200 rounded"
            />
            <p className="text-xs text-gray-600 mt-2">
              URL: {selectedImageUrl}
            </p>
          </div>
        </div>
      )}
      
      {/* Debug Info */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium">Test Coordinates:</p>
          <p className="text-xs text-gray-600">
            Lat: {testCoordinates.lat}, Lng: {testCoordinates.lng}
          </p>
          <p className="text-sm font-medium mt-2">API Key Status:</p>
          <p className="text-xs text-gray-600">
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ Available' : '❌ Not found'}
          </p>
        </div>
      </div>
    </div>
  );
} 