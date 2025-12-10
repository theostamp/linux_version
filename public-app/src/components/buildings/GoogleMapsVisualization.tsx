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
        Animation?: any;
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
    Animation: typeof google.maps.Animation;
    Point: typeof google.maps.Point;
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
        const Animation = (mapsLib as any).Animation || window.google?.maps?.Animation;
        const Point = (coreLib?.Point) || (mapsLib as any).Point || window.google?.maps?.Point;
        
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
          Animation: Animation as typeof google.maps.Animation,
          Point,
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
              Animation: window.google.maps.Animation as any,
              Point: window.google.maps.Point as any,
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
        
        // Custom Map Styles (Clean Light Theme)
        const mapStyles: google.maps.MapTypeStyle[] = [
          {
            featureType: "administrative",
            elementType: "labels.text.fill",
            stylers: [{ color: "#444444" }]
          },
          {
            featureType: "landscape",
            elementType: "all",
            stylers: [{ color: "#f2f2f2" }]
          },
          {
            featureType: "poi",
            elementType: "all",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "road",
            elementType: "all",
            stylers: [{ saturation: -100 }, { lightness: 45 }]
          },
          {
            featureType: "road.highway",
            elementType: "all",
            stylers: [{ visibility: "simplified" }]
          },
          {
            featureType: "road.arterial",
            elementType: "labels.icon",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit",
            elementType: "all",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "water",
            elementType: "all",
            stylers: [{ color: "#4f595d" }, { visibility: "on" }]
          },
          {
            featureType: "water",
            elementType: "geometry.fill",
            stylers: [{ color: "#b3d1ff" }]
          }
        ];

        // Calculate bounds if we have buildings with coordinates
        if (buildingsWithCoordinates.length > 0) {
          const bounds = new mapsApi.LatLngBounds();
          buildingsWithCoordinates.forEach((building) => {
            if (building.latitude != null && building.longitude != null) {
              bounds.extend(new mapsApi.LatLng(building.latitude, building.longitude));
            }
          });

          const mapOptions: google.maps.MapOptions = {
            center: bounds.getCenter().toJSON(),
            zoom: 12,
            mapTypeId: mapsApi.MapTypeId.ROADMAP,
            styles: mapStyles,
            disableDefaultUI: false,
            streetViewControl: true,
            mapTypeControl: false,
          };

          mapInstanceRef.current = new mapsApi.Map(mapContainer, mapOptions);
          mapInstanceRef.current.fitBounds(bounds);
        } else {
          // No buildings with coordinates, use default center
          const mapOptions: google.maps.MapOptions = {
            center: defaultCenter,
            zoom: 10,
            mapTypeId: mapsApi.MapTypeId.ROADMAP,
            styles: mapStyles,
          };

          mapInstanceRef.current = new mapsApi.Map(mapContainer, mapOptions);
        }

        // Create markers for each building
        // Clear existing markers first (if any)
        markersRef.current.forEach((m) => m.setMap(null));
        infoWindowsRef.current.forEach((iw) => iw.close());
        markersRef.current = [];
        infoWindowsRef.current = [];

        buildingsWithCoordinates.forEach((building, index) => {
          if (building.latitude == null || building.longitude == null) return;

          const position = new mapsApi.LatLng(
            building.latitude,
            building.longitude
          );

          // Stagger animation drops slightly
          const timeout = index * 200;

          setTimeout(() => {
            if (!mapInstanceRef.current) return;

            const marker = new mapsApi.Marker({
              position,
              map: mapInstanceRef.current!,
              title: building.name,
              animation: mapsApi.Animation?.DROP, // Add drop animation
              icon: {
                url: 'data:image/svg+xml;base64,' + btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                    <defs>
                      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                      </filter>
                    </defs>
                    <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z" fill="#E11D48" filter="url(#shadow)"/>
                    <circle cx="12" cy="10" r="3.5" fill="white"/>
                  </svg>
                `),
                scaledSize: mapsApi.Size ? new mapsApi.Size(40, 40) : undefined,
                anchor: mapsApi.Point ? new mapsApi.Point(20, 40) : undefined,
              },
            });

            // Create info window
            const infoWindow = new mapsApi.InfoWindow({
              content: `
                <div style="padding: 12px; min-width: 240px; font-family: 'Inter', sans-serif;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <div style="background: #E11D48; width: 8px; height: 8px; border-radius: 50%;"></div>
                    <h3 style="margin: 0; font-weight: 600; font-size: 16px; color: #1f2937;">${building.name}</h3>
                  </div>
                  <p style="margin: 4px 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                    <strong>📍 Διεύθυνση:</strong> ${building.address || 'N/A'}<br/>
                    ${building.city ? `<strong>🏙️ Πόλη:</strong> ${building.city}<br/>` : ''}
                    ${building.postal_code ? `<strong>📮 ΤΚ:</strong> ${building.postal_code}<br/>` : ''}
                    ${building.apartments_count || building.total_apartments
                      ? `<strong>🏢 Διαμερίσματα:</strong> ${building.apartments_count || building.total_apartments}<br/>`
                      : ''}
                  </p>
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: right;">
                    <a href="/buildings/${building.id}" style="display: inline-flex; align-items: center; gap: 4px; background-color: #005866; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500; transition: background-color 0.2s;">
                      Διαχείριση
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </a>
                  </div>
                </div>
              `,
            });

            // Add click listener to marker
            marker.addListener('click', () => {
              // Stop animation on all markers
              markersRef.current.forEach(m => m.setAnimation(null));
              
              // Bounce this marker
              if (mapsApi.Animation) {
                marker.setAnimation(mapsApi.Animation.BOUNCE);
                // Stop bouncing after 2.1 seconds (approx 3 bounces)
                setTimeout(() => {
                    if (marker.getAnimation() !== null) {
                        marker.setAnimation(null);
                    }
                }, 2100);
              }

              // Close all other info windows
              infoWindowsRef.current.forEach((iw) => iw.close());
              infoWindow.open(mapInstanceRef.current!, marker);
            });

            markersRef.current.push(marker);
            infoWindowsRef.current.push(infoWindow);
          }, timeout);
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
  }, [mapsApi, mapContainer, buildingsWithCoordinates]);

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
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <MapPin className="w-5 h-5 text-primary" />
          Χάρτης Κτιρίων
        </CardTitle>
        <CardDescription className="text-muted-foreground">
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
              className="w-full h-[600px] rounded-lg border border-border"
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
