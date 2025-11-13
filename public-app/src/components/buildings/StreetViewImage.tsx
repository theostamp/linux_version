'use client';

import { useEffect, useState } from 'react';
import { Building as BuildingIcon } from 'lucide-react';

interface StreetViewImageProps {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  width?: number;
  height?: number;
  className?: string;
}

export default function StreetViewImage({
  address,
  latitude,
  longitude,
  width = 400,
  height = 300,
  className = '',
}: StreetViewImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If we have coordinates, try to get Street View image
    if (latitude && longitude) {
      // Google Street View Static API
      // Note: Requires API key in production
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      const size = `${width}x${height}`;
      const location = `${latitude},${longitude}`;
      const fov = 90;
      const pitch = 0;
      const heading = 0;

      if (apiKey) {
        const url = `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${location}&fov=${fov}&pitch=${pitch}&heading=${heading}&key=${apiKey}`;
        setImageUrl(url);
        setError(false);
      } else {
        // Fallback: Try to use Google Maps Embed API (no key required for basic usage)
        // Or show placeholder
        setError(true);
      }
    } else {
      setImageUrl(null);
      setError(false);
    }
  }, [latitude, longitude, width, height]);

  if (!latitude || !longitude) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-400">
          <BuildingIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-sm">Δεν υπάρχουν συντεταγμένες</p>
          <p className="text-xs mt-1">Εισάγετε διεύθυνση για προβολή</p>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-400">
          <BuildingIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-sm">Δεν είναι διαθέσιμη προβολή</p>
          <p className="text-xs mt-1">
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              ? 'Δοκιμάστε άλλη γωνία'
              : 'Google Maps API key απαιτείται'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-200 ${className}`}>
      <img
        src={imageUrl}
        alt={`Street view of ${address}`}
        width={width}
        height={height}
        className="w-full h-auto object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

