'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Building } from '@/lib/api';
import { MapPin, Building2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options?: google.maps.MapOptions) => google.maps.Map;
        Marker: new (options?: google.maps.MarkerOptions) => google.maps.Marker;
        InfoWindow: new (options?: google.maps.InfoWindowOptions) => google.maps.InfoWindow;
        LatLng: new (lat: number, lng: number) => google.maps.LatLng;
        LatLngBounds: new () => google.maps.LatLngBounds;
        event: {
          addListener: (instance: any, eventName: string, handler: Function) => void;
          clearInstanceListeners: (instance: any) => void;
        };
        MapTypeId: {
          ROADMAP: google.maps.MapTypeId;
          SATELLITE: google.maps.MapTypeId;
          HYBRID: google.maps.MapTypeId;
          TERRAIN: google.maps.MapTypeId;
        };
      };
    };
  }
}

interface GoogleMapsVisualizationProps {
  buildings: Building[];
}

export default function GoogleMapsVisualization({ buildings }: GoogleMapsVisualizationProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [isMapContainerReady, setIsMapContainerReady] = useState(false);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter buildings that have coordinates
  const buildingsWithCoordinates = buildings.filter(
    (building) => building.latitude != null && building.longitude != null
  );

  type MapsApi = {
    Map: typeof google.maps.Map;
    Marker: typeof google.maps.Marker;
    InfoWindow: typeof google.maps.InfoWindow;
    LatLng: typeof google.maps.LatLng;
    LatLngBounds: typeof google.maps.LatLngBounds;
    MapTypeId: typeof google.maps.MapTypeId;
    Size: typeof google.maps.Size;
    event?: typeof google.maps.event;
  };

  const waitForGoogleMaps = async (timeoutMs = 15000): Promise<MapsApi> => {
    // Start polling for Google Maps API
    const start = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkReady = async () => {
        // Check for modern importLibrary (loading=async)
        if (window.google?.maps?.importLibrary) {
          try {
            const mapsLib = (await window.google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
            const markerLib = (await window.google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
            
            resolve({
              Map: mapsLib.Map,
              Marker: markerLib.Marker || mapsLib.Marker,
              InfoWindow: mapsLib.InfoWindow,
              LatLng: mapsLib.LatLng,
              LatLngBounds: mapsLib.LatLngBounds,
              MapTypeId: mapsLib.MapTypeId,
              Size: mapsLib.Size,
              event: window.google.maps.event,
            });
            return;
          } catch (err) {
            console.warn('[GoogleMapsVisualization] importLibrary failed, falling back', err);
          }
        }
        
        // Check for legacy global objects
        if (window.google?.maps?.Map) {
          resolve({
            Map: window.google.maps.Map,
            Marker: window.google.maps.Marker,
            InfoWindow: window.google.maps.InfoWindow,
            LatLng: window.google.maps.LatLng,
            LatLngBounds: window.google.maps.LatLngBounds,
            MapTypeId: window.google.maps.MapTypeId,
            Size: window.google.maps.Size,
            event: window.google.maps.event,
          });
          return;
        }

        // Timeout check
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Timeout φόρτωσης Google Maps API. Παρακαλώ ανανεώστε τη σελίδα.'));
          return;
        }

        // Continue polling
        requestAnimationFrame(() => setTimeout(checkReady, 100));
      };

      checkReady();
    });
  };

  const handleMapRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      mapRef.current = node;
      setIsMapContainerReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isMapContainerReady || !mapRef.current) return;

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const maps = await waitForGoogleMaps();

        // Default center (Athens, Greece)
        const defaultCenter = { lat: 37.9838, lng: 23.7275 };
        
        // Calculate bounds if we have buildings with coordinates
        let center = defaultCenter;
        let zoom = 10;

        if (buildingsWithCoordinates.length > 0) {
          const bounds = new maps.LatLngBounds();
          buildingsWithCoordinates.forEach((building) => {
            if (building.latitude != null && building.longitude != null) {
              bounds.extend(new maps.LatLng(building.latitude, building.longitude));
            }
          });

          // Create map centered on bounds
          const mapOptions: google.maps.MapOptions = {
            center: bounds.getCenter().toJSON(),
            zoom: 12,
            mapTypeId: maps.MapTypeId.ROADMAP,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
          };

          mapInstanceRef.current = new maps.Map(mapRef.current, mapOptions);
          mapInstanceRef.current.fitBounds(bounds);
        } else {
          // No buildings with coordinates, use default center
          const mapOptions: google.maps.MapOptions = {
            center: defaultCenter,
            zoom: zoom,
            mapTypeId: maps.MapTypeId.ROADMAP,
          };

          mapInstanceRef.current = new maps.Map(mapRef.current, mapOptions);
        }

        // Create markers for each building
        markersRef.current = [];
        infoWindowsRef.current = [];

        buildingsWithCoordinates.forEach((building) => {
          if (building.latitude == null || building.longitude == null) return;

          const position = new window.google.maps.LatLng(
            building.latitude,
            building.longitude
          );

          const marker = new maps.Marker({
            position,
            map: mapInstanceRef.current!,
            title: building.name,
            icon: {
              url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              `),
              scaledSize: maps.Size ? new maps.Size(32, 32) : undefined,
            },
          });

          // Create info window
          const infoWindow = new maps.InfoWindow({
            content: `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">${building.name}</h3>
                <p style="margin: 4px 0; color: #666; font-size: 14px;">
                  <strong>Διεύθυνση:</strong> ${building.address || 'N/A'}<br/>
                  ${building.city ? `<strong>Πόλη:</strong> ${building.city}<br/>` : ''}
                  ${building.postal_code ? `<strong>ΤΚ:</strong> ${building.postal_code}<br/>` : ''}
                  ${building.apartments_count || building.total_apartments
                    ? `<strong>Διαμερίσματα:</strong> ${building.apartments_count || building.total_apartments}<br/>`
                    : ''}
                </p>
              </div>
            `,
          });

          // Add click listener to marker
          marker.addListener('click', () => {
            // Close all other info windows
            infoWindowsRef.current.forEach((iw) => iw.close());
            infoWindow.open(mapInstanceRef.current!, marker);
          });

          markersRef.current.push(marker);
          infoWindowsRef.current.push(infoWindow);
        });

        setMapLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing Google Maps:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Σφάλμα κατά την προετοιμασία του χάρτη'
        );
        setIsLoading(false);
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      // Clear markers and info windows
      markersRef.current.forEach((marker) => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      infoWindowsRef.current.forEach((iw) => iw.close());
      markersRef.current = [];
      infoWindowsRef.current = [];
    };
  }, [buildingsWithCoordinates, isMapContainerReady]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Χάρτης Κτιρίων
          </CardTitle>
          <CardDescription>
            Εμφάνιση όλων των κτιρίων σε χάρτη
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              Παρακαλώ ελέγξτε ότι το Google Maps API key είναι σωστά ρυθμισμένο.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Χάρτης Κτιρίων
        </CardTitle>
        <CardDescription>
          {buildingsWithCoordinates.length > 0
            ? `${buildingsWithCoordinates.length} κτίρια με συντεταγμένες`
            : 'Δεν υπάρχουν κτίρια με συντεταγμένες για εμφάνιση'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">Φόρτωση χάρτη...</p>
            </div>
          </div>
        ) : buildingsWithCoordinates.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              Δεν υπάρχουν κτίρια με συντεταγμένες για εμφάνιση στον χάρτη.
            </p>
            <p className="text-sm text-muted-foreground">
              Προσθέστε συντεταγμένες στα κτίρια για να εμφανίζονται στον χάρτη.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div
              ref={handleMapRef}
              className="w-full h-[600px] rounded-lg border"
              style={{ minHeight: '600px' }}
            />
        {mapLoaded && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Κάντε κλικ σε ένα marker για να δείτε τις λεπτομέρειες του κτιρίου</span>
          </div>
        )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
