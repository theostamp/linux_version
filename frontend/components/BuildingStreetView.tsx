// frontend/components/BuildingStreetView.tsx
'use client';

import { useEffect, useState } from 'react';
import { Camera, MapPin } from 'lucide-react';

interface BuildingStreetViewProps {
  buildingId?: number;
  address?: string;
  streetViewImageUrl?: string; // Add this prop
}

export default function BuildingStreetView({ buildingId, address, streetViewImageUrl }: BuildingStreetViewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First priority: Use the streetViewImageUrl prop if provided
    if (streetViewImageUrl) {
      console.log('🔍 BuildingStreetView: Using provided streetViewImageUrl:', streetViewImageUrl);
      setImageUrl(streetViewImageUrl);
      setError(null);
      return;
    }
    
    // Fallback: Try to find the image based on buildingId or address in localStorage
    if (typeof window !== 'undefined') {
      if (buildingId) {
        const storedImage = localStorage.getItem(`building_street_view_${buildingId}`);
        if (storedImage) {
          console.log('🔍 BuildingStreetView: Using stored image for building', buildingId);
          setImageUrl(storedImage);
          setError(null);
          return;
        }
      }
      
      if (address) {
        const formattedAddress = address.replace(/\s+/g, '_');
        const storedImage = localStorage.getItem(`building_street_view_${formattedAddress}`);
        if (storedImage) {
          console.log('🔍 BuildingStreetView: Using stored image for address:', address);
          setImageUrl(storedImage);
          setError(null);
          return;
        }
      }
    }
    
    // If no image found, set error state
    console.log('🔍 BuildingStreetView: No street view image available');
    setImageUrl(null);
    setError('Δεν υπάρχει διαθέσιμη εικόνα Street View');
  }, [buildingId, address, streetViewImageUrl]);

  // Test image loading
  const testImageUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-500 text-sm">Φόρτωση εικόνας...</p>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <Camera className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">
          {error || 'Δεν υπάρχει διαθέσιμη εικόνα Street View'}
        </p>
        {address && (
          <p className="text-gray-400 text-xs mt-1">
            Διεύθυνση: {address}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="relative">
        <img 
          src={imageUrl} 
          alt="Street View" 
          className="w-full h-[300px] object-cover"
          onError={() => {
            console.log('🔍 BuildingStreetView: Image failed to load:', imageUrl);
            setError('Η εικόνα δεν μπόρεσε να φορτωθεί');
            setImageUrl(null);
          }}
        />
        <div className="absolute bottom-0 left-0 p-2 bg-black bg-opacity-50 rounded-tr-lg">
          <div className="flex items-center space-x-2 text-white text-xs">
            <MapPin className="w-4 h-4" />
            <span>{address || 'Προβολή δρόμου'}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 