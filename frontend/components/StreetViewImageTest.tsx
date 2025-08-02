'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import StreetViewImage from './StreetViewImage';

export default function StreetViewImageTest() {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 37.9838,
    lng: 23.7275
  });
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleImageSelect = (imageUrl: string) => {
    addResult(`📸 Image selected: ${imageUrl.substring(0, 80)}...`);
    setSelectedImageUrl(imageUrl);
  };

  const testWithDifferentCoordinates = () => {
    const newCoords = {
      lat: 37.9750,
      lng: 23.7450
    };
    setCoordinates(newCoords);
    addResult(`📍 Changed coordinates to: Lat ${newCoords.lat}, Lng ${newCoords.lng}`);
  };

  const clearResults = () => {
    setTestResults([]);
    setSelectedImageUrl('');
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold">📸 Street View Image Test</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Street View Component */}
        <div>
          <h4 className="font-medium mb-2">Street View Component:</h4>
          <StreetViewImage
            coordinates={coordinates}
            address="Πανεπιστημίου 30, Αθήνα"
            onImageSelect={handleImageSelect}
          />
        </div>
        
        {/* Test Results */}
        <div>
          <h4 className="font-medium mb-2">Test Results:</h4>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Coordinates:</span> Lat {coordinates.lat}, Lng {coordinates.lng}
            </div>
            
            {selectedImageUrl && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <p className="text-sm text-green-800 font-medium">✅ Image Selected:</p>
                <img 
                  src={selectedImageUrl} 
                  alt="Selected Street View" 
                  className="w-full max-w-xs border border-gray-200 rounded mt-2"
                />
                <p className="text-xs text-gray-600 mt-1 break-all">
                  {selectedImageUrl.substring(0, 100)}...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button onClick={testWithDifferentCoordinates} size="sm">
          Change Coordinates
        </Button>
        <Button onClick={clearResults} size="sm" variant="outline">
          Clear Results
        </Button>
      </div>
      
      {/* Debug Logs */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-sm font-medium mb-2">Debug Logs:</h4>
        <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No logs yet</p>
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