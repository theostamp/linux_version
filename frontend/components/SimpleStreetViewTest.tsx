'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SimpleStreetViewTest() {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testGoogleMapsAPI = () => {
    addResult('🧪 Testing Google Maps API...');
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      addResult('❌ API Key not found');
      return;
    }
    
    addResult('✅ API Key found');
    
    // Test coordinates for Athens
    const testUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=37.9838,23.7275&heading=0&pitch=0&fov=80&key=${apiKey}`;
    
    addResult(`🔗 Testing URL: ${testUrl.substring(0, 100)}...`);
    
    const img = new Image();
    img.onload = () => {
      addResult('✅ Street View image loaded successfully');
      setSelectedImageUrl(testUrl);
    };
    img.onerror = () => {
      addResult('❌ Failed to load Street View image');
    };
    img.src = testUrl;
  };

  const testImageSelection = () => {
    if (selectedImageUrl) {
      addResult(`📸 Image selected: ${selectedImageUrl.substring(0, 80)}...`);
    } else {
      addResult('❌ No image to select');
    }
  };

  // Function to receive image URL from parent component
  const handleImageSelect = (imageUrl: string) => {
    addResult(`📸 Received image from StreetViewImage: ${imageUrl.substring(0, 80)}...`);
    setSelectedImageUrl(imageUrl);
  };

  const clearResults = () => {
    setTestResults([]);
    setSelectedImageUrl('');
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">🧪 Simple Street View Test</h3>
      
      <div className="flex space-x-2">
        <Button onClick={testGoogleMapsAPI} size="sm">
          Test Google Maps API
        </Button>
        <Button onClick={testImageSelection} size="sm" variant="outline">
          Test Image Selection
        </Button>
        <Button onClick={clearResults} size="sm" variant="outline">
          Clear Results
        </Button>
      </div>
      
      {selectedImageUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800 mb-2">✅ Test Image Loaded:</p>
          <img 
            src={selectedImageUrl} 
            alt="Test Street View" 
            className="w-full max-w-md border border-gray-200 rounded"
          />
        </div>
      )}
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-sm font-medium mb-2">Test Results:</h4>
        <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No tests run yet</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-gray-700">{result}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 