'use client';

import { useEffect, useRef, useState } from 'react';
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
        importLibrary?: (library: string) => Promise<any>;
      };
    };
  }
}

interface GoogleMapsVisualizationProps {
  buildings: Building[];
}

export default function GoogleMapsVisualization({ buildings }: GoogleMapsVisualizationProps) {
  // Using useState for the ref ensures re-render when the element is mounted
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [debugStatus, setDebugStatus] = useState<string>('');

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

  const [mapsApi, setMapsApi] = useState<MapsApi | null>(null);

  // Filter buildings that have coordinates
  const buildingsWithCoordinates = buildings.filter(
    (building) => building.latitude != null && building.longitude != null
  );

  const waitForGoogleMaps = async (timeoutMs = 15000): Promise<MapsApi> => {
    const start = Date.now();
    
    // Helper for timeout to prevent hanging indefinitely
    const withTimeout = <T,>(promise: Promise<T>, taskName: string, ms: number = 5000): Promise<T> => {
         return Promise.race([
             promise,
             new Promise<T>((_, reject) => 
                 setTimeout(() => reject(new Error(`Timeout waiting for ${taskName}`)), ms)
             )
         ]);
    };

    setDebugStatus('Checking Google Maps API...');

    // Check for modern importLibrary (loading=async)
    if (window.google?.maps?.importLibrary) {
      try {
        setDebugStatus('Importing maps and core libraries...');
        
        // Load maps and core libraries in parallel
        // Note: 'core' library contains basic geometry like LatLng, LatLngBounds
        const [mapsLib, coreLib] = await Promise.all([
             withTimeout(window.google.maps.importLibrary('maps'), 'maps library') as Promise<google.maps.MapsLibrary>,
             withTimeout(window.google.maps.importLibrary('core'), 'core library').catch(() => null) as Promise<any>
        ]);
        
        setDebugStatus('Libraries loaded. Extracting components...');

        // Robustly resolve components from libraries or global namespace
        const Map = mapsLib.Map;
        const InfoWindow = mapsLib.InfoWindow;
        const MapTypeId = mapsLib.MapTypeId;
        
        // Geometry might be in core or maps or global
        const LatLng = (coreLib?.LatLng) || (mapsLib as any).LatLng || window.google?.maps?.LatLng;
        const LatLngBounds = (coreLib?.LatLngBounds) || (mapsLib as any).LatLngBounds || window.google?.maps?.LatLngBounds;
        const Size = (coreLib?.Size) || (mapsLib as any).Size || window.google?.maps?.Size;
        
        // Marker: Legacy Marker is often in global namespace, but check mapsLib just in case
        // Note: importLibrary('marker') gives AdvancedMarkerElement, not legacy Marker
        const Marker = (mapsLib as any).Marker || window.google?.maps?.Marker;
        
        const event = window.google?.maps?.event;

        if (!Map) throw new Error('Map class missing');
        if (!LatLngBounds) throw new Error('LatLngBounds class missing');
        if (!LatLng) throw new Error('LatLng class missing');
        
        if (!Marker) {
             console.warn('Legacy Marker class missing. Map markers may not appear.');
        }

        setDebugStatus('Google Maps API components ready.');

        return {
          Map,
          Marker: Marker as typeof google.maps.Marker,
          InfoWindow,
          LatLng,
          LatLngBounds,
          MapTypeId,
          Size,
          event,
        };
      } catch (err) {
        console.warn('[GoogleMapsVisualization] importLibrary failed or timed out', err);
        setDebugStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}. Trying legacy fallback...`);
        // Fall through to legacy check
      }
    }
    
    // Check for legacy global objects
    // Poll until available
    return new Promise((resolve, reject) => {
      const checkLegacy = () => {
         const elapsed = Date.now() - start;
         setDebugStatus(`Waiting for legacy Maps API... (${(elapsed/1000).toFixed(1)}s)`);

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
         } else if (elapsed > timeoutMs) {
            reject(new Error('Timeout waiting for Google Maps API'));
         } else {
            setTimeout(checkLegacy, 100);
         }
      };
      checkLegacy();
    });
  };

  // Effect 1: Load API
  useEffect(() => {
    let mounted = true;
    
    const loadApi = async () => {
      try {
        setIsLoading(true);
        const api = await waitForGoogleMaps();
        if (mounted) {
          setMapsApi(api);
          // Important: Set isLoading to false so the div renders and ref callback fires
          setIsLoading(false); 
          setDebugStatus('Maps API loaded. Initializing map...');
        }
      } catch (err) {
        if (mounted) {
          console.error('Error initializing Google Maps:', err);
          setError(
            err instanceof Error
              ? err.message
              : 'Σφάλμα κατά την προετοιμασία του χάρτη'
          );
          setIsLoading(false);
        }
      }
    };

    loadApi();

    return () => { mounted = false; };
  }, []);

  // Effect 2: Initialize Map using loaded API and Container
  useEffect(() => {
    if (!mapsApi || !mapContainer) return;

    try {
        setDebugStatus('Creating map instance...');
        
        // Default center (Athens, Greece)
        const defaultCenter = { lat: 37.9838, lng: 23.7275 };
        
        // Calculate bounds if we have buildings with coordinates
        if (buildingsWithCoordinates.length > 0) {
          const bounds = new mapsApi.LatLngBounds();
          buildingsWithCoordinates.forEach((building) => {
            if (building.latitude != null && building.longitude != null) {
              bounds.extend(new mapsApi.LatLng(building.latitude, building.longitude));
            }
          });

          // Create map centered on bounds
          const mapOptions: google.maps.MapOptions = {
            center: bounds.getCenter().toJSON(),
            zoom: 12,
            mapTypeId: mapsApi.MapTypeId.ROADMAP,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
          };

          mapInstanceRef.current = new mapsApi.Map(mapContainer, mapOptions);
          mapInstanceRef.current.fitBounds(bounds);
        } else {
          // No buildings with coordinates, use default center
          const mapOptions: google.maps.MapOptions = {
            center: defaultCenter,
            zoom: 10,
            mapTypeId: mapsApi.MapTypeId.ROADMAP,
          };

          mapInstanceRef.current = new mapsApi.Map(mapContainer, mapOptions);
        }

        // Create markers for each building
        // Clear existing markers first (if any)
        markersRef.current.forEach((m) => m.setMap(null));
        infoWindowsRef.current.forEach((iw) => iw.close());
        markersRef.current = [];
        infoWindowsRef.current = [];

        buildingsWithCoordinates.forEach((building) => {
          if (building.latitude == null || building.longitude == null) return;

          const position = new mapsApi.LatLng(
            building.latitude,
            building.longitude
          );

          const marker = new mapsApi.Marker({
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
              scaledSize: mapsApi.Size ? new mapsApi.Size(32, 32) : undefined,
            },
          });

          // Create info window
          const infoWindow = new mapsApi.InfoWindow({
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
        setDebugStatus('Map initialized.');

    } catch (err) {
        console.error('Error creating map instance:', err);
        setError(err instanceof Error ? err.message : 'Σφάλμα κατά τη δημιουργία του χάρτη');
    }

    // Cleanup function
    return () => {
        markersRef.current.forEach((marker) => marker.setMap(null));
        infoWindowsRef.current.forEach((iw) => iw.close());
        markersRef.current = [];
        infoWindowsRef.current = [];
    };
  }, [mapsApi, mapContainer, buildingsWithCoordinates]); // Re-run if buildings change

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
              <p className="text-xs text-muted-foreground mt-2 font-mono">{debugStatus}</p>
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
              ref={setMapContainer}
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
