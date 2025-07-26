declare global {
  interface Window {
    google: {
      maps: {
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
        
        event?: {
          clearInstanceListeners: (instance: any) => void;
        };
      };
    };
  }
}

export {}; 