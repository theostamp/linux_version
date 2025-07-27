// frontend/components/BuildingStreetView.tsx
'use client';

import { useEffect, useState } from 'react';
import { Camera, MapPin } from 'lucide-react';

interface BuildingStreetViewProps {
  buildingId?: number;
  address?: string;
}

export default function BuildingStreetView({ buildingId, address }: BuildingStreetViewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Προσπαθούμε να βρούμε την εικόνα με βάση το buildingId ή τη διεύθυνση
    if (typeof window !== 'undefined') {
      if (buildingId) {
        const storedImage = localStorage.getItem(`building_street_view_${buildingId}`);
        if (storedImage) {
          setImageUrl(storedImage);
          return;
        }
      }
      
      if (address) {
        const formattedAddress = address.replace(/\s+/g, '_');
        const storedImage = localStorage.getItem(`building_street_view_${formattedAddress}`);
        if (storedImage) {
          setImageUrl(storedImage);
          return;
        }
      }
    }
  }, [buildingId, address]);

  if (!imageUrl) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <Camera className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">
          Δεν υπάρχει αποθηκευμένη εικόνα Street View
        </p>
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