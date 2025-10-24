'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Building, Info, ExternalLink } from 'lucide-react';
import { Building as BuildingType } from '@/lib/api';
import BuildingDetailsModal from './BuildingDetailsModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    console.log('🗺️ [GMAPS DEBUG] useEffect triggered with:', {
      apiKey: !!apiKey,
      mapRefExists: !!mapRef.current,
      buildingsCount: buildings.length
    });
    
    if (!apiKey) {
      console.error('🗺️ [GMAPS DEBUG] API key missing!');
      setError('Google Maps API key is missing');
      setLoading(false);
      return;
    }

    // Set loading to false so mapRef element can render
    if (loading) {
      console.log('🗺️ [GMAPS DEBUG] Setting loading to false to render mapRef...');
      setLoading(false);
      return; // Return so useEffect can run again with mapRef available
    }

    if (!mapRef.current) {
      console.log('🗺️ [GMAPS DEBUG] mapRef not ready yet, skipping...');
      return;
    }
    
    if (buildings.length === 0) {
      console.log('🗺️ [GMAPS DEBUG] No buildings yet, skipping map creation...');
      return;
    }
    
    console.log('🗺️ [GMAPS DEBUG] Starting to load Google Maps script...');

    loadGoogleMapsScript(apiKey)
      .then(() => {
        console.log('🗺️ [GMAPS DEBUG] Google Maps script loaded, creating map...');
        if (!mapRef.current) {
          console.error('🗺️ [GMAPS DEBUG] mapRef became null after script load!');
          return;
        }

        // Calculate center if not provided
        const mapCenter = center || calculateMapCenter(buildings);
        console.log('🗺️ [GMAPS DEBUG] Map center calculated:', mapCenter);
        
        const googleMap = new (window as any).google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: zoom,
          mapTypeId: (window as any).google.maps.MapTypeId.ROADMAP,
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

        console.log('🗺️ [GMAPS DEBUG] Google Map created successfully!', googleMap);
        setMap(googleMap);
      })
      .catch((error) => {
        console.error('🗺️ [GMAPS DEBUG] Error loading Google Maps:', error);
        console.error('Error loading Google Maps:', error);
        setError('Σφάλμα φόρτωσης Google Maps');
      });
  }, [apiKey, center, zoom, buildings, loading]); // Add loading to dependencies

  // Calculate center based on buildings with coordinates
  const calculateMapCenter = (buildings: BuildingType[]) => {
    console.log('🗺️ [GMAPS DEBUG] calculateMapCenter called with buildings:', buildings.length);
    const buildingsWithCoords = buildings.filter(b => 
      (b.latitude && b.longitude) || (b.coordinates?.lat && b.coordinates?.lng)
    );
    console.log('🗺️ [GMAPS DEBUG] Buildings with coordinates:', buildingsWithCoords.length);
    console.log('🗺️ [GMAPS DEBUG] Sample building coords:', buildingsWithCoords[0] ? {
      name: buildingsWithCoords[0].name,
      latitude: buildingsWithCoords[0].latitude,
      longitude: buildingsWithCoords[0].longitude,
      coordinates: buildingsWithCoords[0].coordinates
    } : 'None');
    
    if (buildingsWithCoords.length === 0) {
      // Default to Athens center if no coordinates
      console.log('🗺️ [GMAPS DEBUG] No buildings with coords, using Athens default');
      return { lat: 37.9838, lng: 23.7275 };
    }

    const totalLat = buildingsWithCoords.reduce((sum, b) => {
      // Handle both number and string coordinates
      let lat: number | undefined = (b.latitude ?? b.coordinates?.lat) as any;
      if (typeof lat === 'string') lat = parseFloat(lat);
      if (typeof lat !== 'number' || isNaN(lat)) lat = 0;
      console.log('🗺️ [GMAPS DEBUG] Building lat processed:', { building: b.name, original: b.latitude, processed: lat });
      return sum + lat;
    }, 0);
    
    const totalLng = buildingsWithCoords.reduce((sum, b) => {
      // Handle both number and string coordinates  
      let lng: number | undefined = (b.longitude ?? b.coordinates?.lng) as any;
      if (typeof lng === 'string') lng = parseFloat(lng);
      if (typeof lng !== 'number' || isNaN(lng)) lng = 0;
      console.log('🗺️ [GMAPS DEBUG] Building lng processed:', { building: b.name, original: b.longitude, processed: lng });
      return sum + lng;
    }, 0);
    
    const center = {
      lat: totalLat / buildingsWithCoords.length,
      lng: totalLng / buildingsWithCoords.length
    };
   
    console.log('🗺️ [GMAPS DEBUG] Calculated center:', center);
   
    // Validate the center coordinates
    if (isNaN(center.lat) || isNaN(center.lng)) {
      console.error('🗺️ [GMAPS DEBUG] Invalid center calculated, using Athens default');
      return { lat: 37.9838, lng: 23.7275 };
    }
    
    return center;
  };

  // Create markers for buildings
  const createMarkers = useCallback(() => {
    if (!map) return;

    const newMarkers: MapMarker[] = [];
    const bounds = new (window as any).google.maps.LatLngBounds();

    buildings.forEach((building) => {
      // Handle both number and string coordinates from backend
      let lat: number | undefined = (building.latitude ?? building.coordinates?.lat) as any;
      let lng: number | undefined = (building.longitude ?? building.coordinates?.lng) as any;

      if (typeof lat === 'string') lat = parseFloat(lat);
      if (typeof lng === 'string') lng = parseFloat(lng);

      if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        console.warn(`Building ${building.name} has invalid coordinates:`, { lat, lng, original: { latitude: building.latitude, longitude: building.longitude } });
        return;
      }

      console.log('🗺️ [GMAPS DEBUG] Creating marker for building:', { name: building.name, lat, lng });

      const position = new (window as any).google.maps.LatLng(lat, lng);

      // Create building icon SVG function
      const createBuildingIcon = (baseColor: string, roofColor: string) => `
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Shadow -->
          <ellipse cx="20" cy="37" rx="16" ry="2" fill="rgba(0,0,0,0.3)"/>
          
          <!-- Building base -->
          <rect x="6" y="15" width="28" height="20" fill="${baseColor}" stroke="white" stroke-width="2" rx="1"/>
          
          <!-- Roof -->
          <path d="M4 15 L20 5 L36 15 Z" fill="${roofColor}" stroke="white" stroke-width="2"/>
          
          <!-- Windows row 1 -->
          <rect x="10" y="19" width="4" height="4" fill="white" rx="0.5"/>
          <rect x="18" y="19" width="4" height="4" fill="white" rx="0.5"/>
          <rect x="26" y="19" width="4" height="4" fill="white" rx="0.5"/>
          
          <!-- Windows row 2 -->
          <rect x="10" y="26" width="4" height="4" fill="white" rx="0.5"/>
          <rect x="18" y="26" width="4" height="4" fill="white" rx="0.5"/>
          <rect x="26" y="26" width="4" height="4" fill="white" rx="0.5"/>
          
          <!-- Door -->
          <rect x="17" y="30" width="6" height="5" fill="#FFF" stroke="${baseColor}" stroke-width="1" rx="0.5"/>
          <circle cx="21.5" cy="32.5" r="0.5" fill="${baseColor}"/>
        </svg>
      `;

      // Create normal and hover icons
      const normalIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createBuildingIcon('#3B82F6', '#1E40AF'))}`,
        scaledSize: new (window as any).google.maps.Size(40, 40),
        anchor: new (window as any).google.maps.Point(20, 37)
      };

      const hoverIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createBuildingIcon('#F97316', '#EA580C'))}`,
        scaledSize: new (window as any).google.maps.Size(40, 40),
        anchor: new (window as any).google.maps.Point(20, 37)
      };

      const marker = new (window as any).google.maps.Marker({
        position,
        map,
        title: building.name,
        icon: normalIcon,
        animation: (window as any).google.maps.Animation.DROP
      });

      let infoWindow: any;

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

        infoWindow = new (window as any).google.maps.InfoWindow({
          content: infoContent
        });

        marker.addListener('click', () => {
          // Open modal with building details
          setSelectedBuilding(building);
          setIsModalOpen(true);
          
          // Still show info window for quick preview
          if (showInfoWindows && infoWindow) {
            // Close all other info windows
            newMarkers.forEach(m => m.infoWindow?.close());
            infoWindow.open(map, marker);
          }
        });
      }

      marker.addListener('mouseover', () => {
        marker.setIcon(hoverIcon);
        marker.setAnimation((window as any).google.maps.Animation.BOUNCE);
      });

      marker.addListener('mouseout', () => {
        marker.setIcon(normalIcon);
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
        (window as any).google.maps.event.clearInstanceListeners(marker);
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
    <>
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
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100"
              >
                <Info className="w-3 h-3" />
                <span>Περισσότερα</span>
              </button>
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
     
      {/* Building Details Modal */}
      <BuildingDetailsModal
        building={selectedBuilding}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
} 