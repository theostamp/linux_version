// frontend/components/StreetViewImage.tsx
'use client';

import { useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StreetViewImageProps {
  coordinates?: { lat: number; lng: number };
  address?: string;
  onImageSelect: (imageUrl: string) => void;
}

export default function StreetViewImage({ coordinates, address, onImageSelect }: StreetViewImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState(0); // 0 degrees = facing north
  const [zoom, setZoom] = useState(80); // Default FOV (Field of View) - lower values = more zoom
  const [selected, setSelected] = useState(false);
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  useEffect(() => {
    if (coordinates && apiKey) {
      generateStreetViewUrl();
    } else {
      setImageUrl(null);
      setError(null);
      setSelected(false);
    }
  }, [coordinates, heading, zoom, apiKey]);

  const generateStreetViewUrl = () => {
    if (!coordinates || !apiKey) return;
    
    setLoading(true);
    setError(null);
    
    // Create Street View Static API URL with FOV parameter for zoom
    const url = `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${coordinates.lat},${coordinates.lng}&heading=${heading}&pitch=0&fov=${zoom}&key=${apiKey}`;
    
    // Check if image exists by loading it
    const img = new Image();
    img.onload = () => {
      setImageUrl(url);
      setLoading(false);
    };
    img.onerror = () => {
      setImageUrl(null);
      setError('Δεν βρέθηκε εικόνα Street View για αυτή τη διεύθυνση.');
      setLoading(false);
    };
    img.src = url;
  };

  const rotateView = (degrees: number) => {
    setHeading((prevHeading) => (prevHeading + degrees) % 360);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom((prevZoom) => {
      // FOV range is 10 to 120 (10 = maximum zoom in, 120 = maximum zoom out)
      if (direction === 'in') {
        return Math.max(prevZoom - 10, 10); // Zoom in (decrease FOV)
      } else {
        return Math.min(prevZoom + 10, 120); // Zoom out (increase FOV)
      }
    });
  };

  const handleSelectImage = () => {
    if (imageUrl) {
      onImageSelect(imageUrl);
      setSelected(true);
    }
  };

  if (!coordinates) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <Camera className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">
          Επιλέξτε πρώτα μια διεύθυνση για να δείτε την εικόνα Street View
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {loading ? (
        <div className="bg-gray-50 h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 h-[300px] flex flex-col items-center justify-center p-4">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-red-700 text-center">{error}</p>
          {address && (
            <p className="text-red-600 text-sm mt-2">
              Διεύθυνση: {address}
            </p>
          )}
        </div>
      ) : imageUrl ? (
        <div className="relative">
          <img 
            src={imageUrl} 
            alt="Street View" 
            className="w-full h-[300px] object-cover"
          />
          <div className="absolute bottom-0 right-0 p-2 bg-black bg-opacity-50 rounded-tl-lg">
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => rotateView(-90)}
                className="bg-white text-gray-800 hover:bg-gray-100"
              >
                <RefreshCw className="w-4 h-4 mr-1 rotate-[-90deg]" /> Αριστερά
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => rotateView(90)}
                className="bg-white text-gray-800 hover:bg-gray-100"
              >
                <RefreshCw className="w-4 h-4 mr-1 rotate-90" /> Δεξιά
              </Button>
            </div>
          </div>
          
          {/* Zoom Controls */}
          <div className="absolute top-0 right-0 p-2 bg-black bg-opacity-50 rounded-bl-lg">
            <div className="flex flex-col space-y-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleZoom('in')}
                disabled={zoom <= 10}
                className="bg-white text-gray-800 hover:bg-gray-100"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleZoom('out')}
                disabled={zoom >= 120}
                className="bg-white text-gray-800 hover:bg-gray-100"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 h-[300px] flex items-center justify-center">
          <p className="text-gray-500">Δεν βρέθηκε εικόνα</p>
        </div>
      )}
      
      {imageUrl && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <Button 
            onClick={handleSelectImage}
            variant={selected ? "outline" : "default"}
            className={`w-full ${selected ? 'bg-green-50 text-green-700 border-green-300' : ''}`}
            disabled={selected}
          >
            {selected ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Η εικόνα επιλέχθηκε
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Επιλογή αυτής της εικόνας
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 