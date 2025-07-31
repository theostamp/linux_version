'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface StreetViewDebuggerProps {
  coordinates?: { lat: number; lng: number };
  address?: string;
  onImageSelect?: (imageUrl: string) => void;
}

export default function StreetViewDebugger({ 
  coordinates, 
  address, 
  onImageSelect 
}: StreetViewDebuggerProps) {
  const [testImageUrl, setTestImageUrl] = useState<string>('');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [debugSteps, setDebugSteps] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState<string>('');

  const addStep = (step: string) => {
    setDebugSteps(prev => [...prev, `${new Date().toLocaleTimeString()}: ${step}`]);
  };

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    setApiKey(key || '');
    addStep(`🔑 API Key: ${key ? 'Found' : 'Not found'}`);
  }, []);

  useEffect(() => {
    if (coordinates) {
      addStep(`📍 Coordinates received: Lat ${coordinates.lat}, Lng ${coordinates.lng}`);
    }
  }, [coordinates]);

  const testGoogleMapsAPI = () => {
    addStep('🧪 Testing Google Maps API...');
    
    if (!apiKey) {
      addStep('❌ No API key available');
      return;
    }
    
    if (!coordinates) {
      addStep('❌ No coordinates available');
      return;
    }
    
    const testUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${coordinates.lat},${coordinates.lng}&heading=0&pitch=0&fov=80&key=${apiKey}`;
    addStep(`🔗 Generated URL: ${testUrl.substring(0, 80)}...`);
    
    const img = new Image();
    img.onload = () => {
      addStep('✅ Street View image loaded successfully');
      setTestImageUrl(testUrl);
    };
    img.onerror = () => {
      addStep('❌ Failed to load Street View image');
    };
    img.src = testUrl;
  };

  const handleImageSelect = (imageUrl: string) => {
    addStep(`📸 Image selected: ${imageUrl.substring(0, 80)}...`);
    setSelectedImageUrl(imageUrl);
    
    if (onImageSelect) {
      addStep('📤 Calling onImageSelect callback...');
      onImageSelect(imageUrl);
      addStep('✅ onImageSelect callback completed');
    } else {
      addStep('⚠️ No onImageSelect callback provided');
    }
  };

  const testImageSelection = () => {
    if (testImageUrl) {
      handleImageSelect(testImageUrl);
    } else {
      addStep('❌ No test image available');
    }
  };

  const clearDebug = () => {
    setDebugSteps([]);
    setTestImageUrl('');
    setSelectedImageUrl('');
  };

  const getStatusIcon = () => {
    if (!apiKey) return <XCircle className="w-5 h-5 text-red-500" />;
    if (!coordinates) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    if (selectedImageUrl) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Camera className="w-5 h-5 text-blue-500" />;
  };

  const getStatusText = () => {
    if (!apiKey) return 'No API Key';
    if (!coordinates) return 'No Coordinates';
    if (selectedImageUrl) return 'Image Selected';
    return 'Ready to Test';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          {getStatusIcon()}
          <span>Street View Debugger</span>
        </h3>
        <span className="text-sm text-gray-600">{getStatusText()}</span>
      </div>
      
      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 p-2 rounded">
          <span className="font-medium">API Key:</span> {apiKey ? '✅ Found' : '❌ Missing'}
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <span className="font-medium">Coordinates:</span> {coordinates ? '✅ Available' : '❌ Missing'}
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <span className="font-medium">Test Image:</span> {testImageUrl ? '✅ Loaded' : '❌ Not loaded'}
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <span className="font-medium">Selected Image:</span> {selectedImageUrl ? '✅ Selected' : '❌ Not selected'}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button onClick={testGoogleMapsAPI} size="sm" disabled={!apiKey || !coordinates}>
          Test API
        </Button>
        <Button onClick={testImageSelection} size="sm" variant="outline" disabled={!testImageUrl}>
          Test Selection
        </Button>
        <Button onClick={clearDebug} size="sm" variant="outline">
          Clear
        </Button>
      </div>
      
      {/* Test Image Display */}
      {testImageUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800 mb-2">✅ Test Image Loaded:</p>
          <img 
            src={testImageUrl} 
            alt="Test Street View" 
            className="w-full max-w-md border border-gray-200 rounded"
          />
        </div>
      )}
      
      {/* Selected Image Display */}
      {selectedImageUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 mb-2">📸 Selected Image:</p>
          <img 
            src={selectedImageUrl} 
            alt="Selected Street View" 
            className="w-full max-w-md border border-gray-200 rounded"
          />
          <p className="text-xs text-gray-600 mt-2 break-all">
            URL: {selectedImageUrl}
          </p>
        </div>
      )}
      
      {/* Debug Steps */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-sm font-medium mb-2">Debug Steps:</h4>
        <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
          {debugSteps.length === 0 ? (
            <p className="text-gray-500">No steps recorded yet</p>
          ) : (
            debugSteps.map((step, index) => (
              <div key={index} className="text-gray-700">{step}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 