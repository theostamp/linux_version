'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestStreetView() {
  const [testImageUrl, setTestImageUrl] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');

  const testStreetView = () => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    setApiKey(key || 'NOT_FOUND');
    
    if (!key) {
      console.error('❌ Google Maps API Key not found!');
      return;
    }

    // Test coordinates for Athens
    const testUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=37.9838,23.7275&heading=0&pitch=0&fov=80&key=${key}`;
    setTestImageUrl(testUrl);
    
    console.log('🧪 Test Street View URL:', testUrl);
    
    // Test if image loads
    const img = new Image();
    img.onload = () => {
      console.log('✅ Test image loaded successfully');
    };
    img.onerror = () => {
      console.error('❌ Test image failed to load');
    };
    img.src = testUrl;
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">🧪 Street View Test</h3>
      
      <div className="space-y-4">
        <Button onClick={testStreetView}>
          Test Street View API
        </Button>
        
        <div>
          <p className="text-sm font-medium">API Key Status:</p>
          <p className="text-xs text-gray-600">
            {apiKey ? (apiKey === 'NOT_FOUND' ? '❌ Not found' : '✅ Found') : 'Not tested'}
          </p>
        </div>
        
        {testImageUrl && (
          <div>
            <p className="text-sm font-medium">Test Image:</p>
            <img 
              src={testImageUrl} 
              alt="Test Street View" 
              className="w-full max-w-md border border-gray-200 rounded"
            />
            <p className="text-xs text-gray-600 mt-2">
              URL: {testImageUrl.substring(0, 100)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 