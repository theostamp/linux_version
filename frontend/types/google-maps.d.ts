declare global {
  interface Window {
    google: {
      maps: {
        // Core Maps API
        Map: new (
          mapDiv: HTMLElement,
          opts?: {
            center?: google.maps.LatLng | google.maps.LatLngLiteral;
            zoom?: number;
            mapTypeId?: google.maps.MapTypeId;
            mapTypeControl?: boolean;
            streetViewControl?: boolean;
            fullscreenControl?: boolean;
            zoomControl?: boolean;
            styles?: google.maps.MapTypeStyle[];
          }
        ) => google.maps.Map;

        LatLng: new (lat: number, lng: number) => google.maps.LatLng;
        LatLngBounds: new () => google.maps.LatLngBounds;
        
        MapTypeId: {
          ROADMAP: google.maps.MapTypeId;
          SATELLITE: google.maps.MapTypeId;
          HYBRID: google.maps.MapTypeId;
          TERRAIN: google.maps.MapTypeId;
        };

        MapTypeStyle: {
          featureType?: string;
          elementType?: string;
          stylers?: Array<{ [key: string]: any }>;
        };

        // Marker API
        Marker: new (opts?: {
          position?: google.maps.LatLng | google.maps.LatLngLiteral;
          map?: google.maps.Map;
          title?: string;
          icon?: string | google.maps.Icon | google.maps.Symbol;
          animation?: google.maps.Animation;
        }) => google.maps.Marker;

        // InfoWindow API
        InfoWindow: new (opts?: {
          content?: string | HTMLElement;
          position?: google.maps.LatLng | google.maps.LatLngLiteral;
          maxWidth?: number;
        }) => google.maps.InfoWindow;

        // Animation enum
        Animation: {
          BOUNCE: google.maps.Animation;
          DROP: google.maps.Animation;
        };

        // Size and Point classes
        Size: new (width: number, height: number) => google.maps.Size;
        Point: new (x: number, y: number) => google.maps.Point;

        // Event system
        event: {
          clearInstanceListeners: (instance: any) => void;
        };

        places: {
          // Legacy API (deprecated for new customers)
          Autocomplete?: new (
            input: HTMLInputElement,
            options?: {
              componentRestrictions?: { country: string };
              types?: string[];
              fields?: string[];
            }
          ) => {
            addListener: (event: string, callback: () => void) => void;
            getPlace: () => {
              address_components?: Array<{
                long_name: string;
                short_name: string;
                types: string[];
              }>;
              formatted_address?: string;
              geometry?: {
                location: {
                  lat: () => number;
                  lng: () => number;
                };
              };
            };
          };
          
          // New API (recommended) - χωρίς fields παράμετρο
          PlaceAutocompleteElement?: new (options?: {
            componentRestrictions?: { country: string };
            types?: string[];
            // Αφαίρεσα το fields - δεν υποστηρίζεται
          }) => HTMLElement & {
            addEventListener: (
              event: 'gmp-placeselect',
              callback: (event: {
                place: {
                  address_components?: Array<{
                    long_name: string;
                    short_name: string;
                    types: string[];
                  }>;
                  formatted_address?: string;
                  geometry?: {
                    location: {
                      lat: () => number;
                      lng: () => number;
                    };
                  };
                };
              }) => void
            ) => void;
          };
        };
      };
    };
  }

  namespace google.maps {
    interface Map {
      setCenter(latlng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      fitBounds(bounds: LatLngBounds): void;
      getZoom(): number;
    }

    interface LatLng {
      lat(): number;
      lng(): number;
    }

    interface LatLngBounds {
      extend(point: LatLng | LatLngLiteral): void;
    }

    interface Marker {
      setMap(map: Map | null): void;
      setPosition(position: LatLng | LatLngLiteral): void;
      setTitle(title: string): void;
      setIcon(icon: string | Icon | Symbol): void;
      setAnimation(animation: Animation | null): void;
      addListener(eventName: string, handler: Function): void;
      getPosition(): LatLng;
    }

    interface InfoWindow {
      open(map?: Map, anchor?: Marker): void;
      close(): void;
      setContent(content: string | HTMLElement): void;
      setPosition(position: LatLng | LatLngLiteral): void;
    }

    interface Icon {
      url: string;
      scaledSize?: Size;
      anchor?: Point;
    }

    interface Symbol {
      path: string;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }

    interface Size {
      width: number;
      height: number;
    }

    interface Point {
      x: number;
      y: number;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface MapTypeId {}
    interface Animation {}
  }
}

export {}; 