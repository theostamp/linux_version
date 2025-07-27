'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Building, Info, ExternalLink } from 'lucide-react';
import { Building as BuildingType } from '@/lib/api';

interface GoogleMapsVisualizationProps {
  buildings: BuildingType[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  showInfoWindows?: boolean;
}

interface MapMarker {
  position: google.maps.LatLng;
  building: BuildingType;
  marker: google.maps.Marker;
  infoWindow?: google.maps.InfoWindow;
}

export default function GoogleMapsVisualization({
  buildings,
  center,
  zoom = 12,
  height = '600px',
  showInfoWindows = true
}: GoogleMapsVisualizationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Google Maps Script Loader (using existing pattern from your project)
  const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google?.maps) {
        console.log('✅ Google Maps already loaded');
        resolve();
        return;
      }

      // Check for existing script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('📜 Existing Google Maps script found');
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
        return;
      }

      console.log('📜 Creating new Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ Google Maps script loaded successfully');
        resolve();
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Google Maps script');
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!apiKey) {
      setError('Google Maps API key is missing');
      setLoading(false);
      return;
    }

    if (!mapRef.current) return;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!mapRef.current) return;

        // Calculate center if not provided
        const mapCenter = center || calculateMapCenter(buildings);
        
        const googleMap = new google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: zoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        setMap(googleMap);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
        setError('Σφάλμα φόρτωσης Google Maps');
        setLoading(false);
      });
  }, [apiKey, center, zoom]);

  // Calculate center based on buildings with coordinates
  const calculateMapCenter = (buildings: BuildingType[]) => {
    const buildingsWithCoords = buildings.filter(b => 
      (b.latitude && b.longitude) || (b.coordinates?.lat && b.coordinates?.lng)
    );
    
    if (buildingsWithCoords.length === 0) {
      // Default to Athens center if no coordinates
      return { lat: 37.9838, lng: 23.7275 };
    }

    const totalLat = buildingsWithCoords.reduce((sum, b) => {
      const lat = b.latitude || b.coordinates?.lat || 0;
      return sum + lat;
    }, 0);
    
    const totalLng = buildingsWithCoords.reduce((sum, b) => {
      const lng = b.longitude || b.coordinates?.lng || 0;
      return sum + lng;
    }, 0);
    
    return {
      lat: totalLat / buildingsWithCoords.length,
      lng: totalLng / buildingsWithCoords.length
    };
  };

  // Create markers for buildings
  const createMarkers = useCallback(() => {
    if (!map) return;

    const newMarkers: MapMarker[] = [];
    const bounds = new google.maps.LatLngBounds();

    buildings.forEach((building) => {
      // Check for coordinates in both formats (backend and frontend)
      const lat = building.latitude || building.coordinates?.lat;
      const lng = building.longitude || building.coordinates?.lng;
      
      if (!lat || !lng) {
        console.warn(`Building ${building.name} has no coordinates`);
        return;
      }

      const position = new google.maps.LatLng(lat, lng);

      // Create custom marker icon
      const markerIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
            <path d="M16 8 L16 24 M8 16 L24 16" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      };

      const marker = new google.maps.Marker({
        position,
        map,
        title: building.name,
        icon: markerIcon,
        animation: google.maps.Animation.DROP
      });

      let infoWindow: google.maps.InfoWindow | undefined;

      if (showInfoWindows) {
        const infoContent = `
          <div style="padding: 8px; max-width: 250px;">
            <div style="font-weight: bold; color: #1F2937; margin-bottom: 4px;">
              ${building.name}
            </div>
            <div style="color: #6B7280; font-size: 14px; margin-bottom: 8px;">
              <div>📍 ${building.address}</div>
              ${building.city ? `<div>🏙️ ${building.city}</div>` : ''}
              ${building.postal_code ? `<div>📮 ${building.postal_code}</div>` : ''}
              ${building.apartments_count ? `<div>🏢 ${building.apartments_count} διαμερίσματα</div>` : ''}
            </div>
            <div style="margin-top: 8px;">
              <button onclick="window.open('https://www.google.com/maps?q=${lat},${lng}', '_blank')" 
                      style="background: #3B82F6; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                Άνοιγμα σε Google Maps
              </button>
            </div>
          </div>
        `;

        infoWindow = new google.maps.InfoWindow({
          content: infoContent
        });

        marker.addListener('click', () => {
          // Close all other info windows
          newMarkers.forEach(m => m.infoWindow?.close());
          infoWindow?.open(map, marker);
          setSelectedBuilding(building);
        });
      }

      marker.addListener('mouseover', () => {
        marker.setAnimation(google.maps.Animation.BOUNCE);
      });

      marker.addListener('mouseout', () => {
        marker.setAnimation(null);
      });

      newMarkers.push({ position, building, marker, infoWindow });
      bounds.extend(position);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);
      
      // If only one marker, set a reasonable zoom level
      if (newMarkers.length === 1) {
        map.setZoom(15);
      }
    }
  }, [map, buildings, showInfoWindows]);

  // Create markers when map is ready
  useEffect(() => {
    if (map && buildings.length > 0) {
      createMarkers();
    }
  }, [map, buildings, createMarkers]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      markers.forEach(({ marker, infoWindow }) => {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
        infoWindow?.close();
      });
    };
  }, [markers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Φόρτωση χάρτη...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center text-red-600">
          <MapPin className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height }} className="rounded-lg shadow-lg" />
      
      {/* Selected building info panel */}
      {selectedBuilding && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm border">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {selectedBuilding.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedBuilding.address}
              </p>
              {selectedBuilding.city && (
                <p className="text-sm text-gray-500">
                  {selectedBuilding.city}
                  {selectedBuilding.postal_code && `, ${selectedBuilding.postal_code}`}
                </p>
              )}
              {selectedBuilding.apartments_count && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedBuilding.apartments_count} διαμερίσματα
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedBuilding(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => {
                const lat = selectedBuilding.latitude || selectedBuilding.coordinates?.lat;
                const lng = selectedBuilding.longitude || selectedBuilding.coordinates?.lng;
                if (lat && lng) {
                  window.open(
                    `https://www.google.com/maps?q=${lat},${lng}`,
                    '_blank'
                  );
                }
              }}
              className="flex items-center space-x-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Google Maps</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats panel */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 border">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {buildings.filter(b => 
              (b.latitude && b.longitude) || (b.coordinates?.lat && b.coordinates?.lng)
            ).length}
          </div>
          <div className="text-xs text-gray-500">Κτίρια στον χάρτη</div>
        </div>
      </div>
    </div>
  );
} 