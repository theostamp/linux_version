"use client"

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';

interface AddressAutocompleteProps {
  onAddressSelect: (addressDetails: {
    fullAddress: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }) => void;
  value?: string;
  required?: boolean;
}

// Google Maps Script Loader με νέες βιβλιοθήκες
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    // Νέο API με extended maps library
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,maps&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
};

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onAddressSelect,
  value = '', // Default value για να αποφύγουμε uncontrolled->controlled issue
  required = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteElementRef = useRef<HTMLElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [inputValue, setInputValue] = useState(value || ''); // Controlled state
  const isInitializedRef = useRef(false); // Protection κατά διπλής εκτέλεσης

  // Sync external value changes
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    // Protection κατά διπλής εκτέλεσης
    if (isInitializedRef.current) {
      console.log('🛑 AddressAutocomplete already initialized, skipping...');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_ACTUAL_API_KEY_HERE') {
      setError('Google Maps API key δεν έχει ρυθμιστεί. Ελέγξτε το .env.local αρχείο.');
      return;
    }

    console.log('🚀 Initializing AddressAutocomplete...');
    isInitializedRef.current = true;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        // Double check αν το component έχει unmount
        if (!inputRef.current) {
          console.log('🛑 Component unmounted before initialization');
          return;
        }

        if (inputRef.current && window.google?.maps?.places?.PlaceAutocompleteElement) {
          try {
            // Καθαρισμός τυχόν προηγούμενων instances
            if (autocompleteElementRef.current) {
              console.log('🧹 Cleaning previous autocomplete element');
              autocompleteElementRef.current.remove();
              autocompleteElementRef.current = null;
            }

            console.log('🏗️ Creating new PlaceAutocompleteElement...');
            
            // Χρήση του νέου PlaceAutocompleteElement με σωστές παραμέτρους
            const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
              componentRestrictions: { country: 'gr' },
              types: ['address']
              // Αφαίρεσα το 'fields' - δεν υποστηρίζεται από το νέο API
            });

            // Αντικατάσταση του input με το νέο element
            if (inputRef.current.parentNode) {
              inputRef.current.parentNode.insertBefore(autocompleteElement, inputRef.current);
              inputRef.current.style.display = 'none';
              // Αφαιρώ το required attribute από το κρυμμένο input για να αποφύγω validation errors
              inputRef.current.removeAttribute('required');
              autocompleteElementRef.current = autocompleteElement;
            }

            // Event listener για επιλογή τοποθεσίας
            autocompleteElement.addEventListener('gmp-placeselect', (event: any) => {
              console.log('🎯 EVENT FIRED: gmp-placeselect'); // Debug log
              const place = event.place;
              
              console.log('🗺️ Selected place from Google Maps:', place); // Debug log
              
              if (!place) {
                console.error('❌ No place object received'); // Debug log
                setError('Δεν ελήφθη τοποθεσία');
                return;
              }
              
              if (!place.address_components) {
                console.error('❌ No address_components in place:', place); // Debug log
                setError('Δεν βρέθηκαν λεπτομέρειες διεύθυνσης');
                return;
              }

              const addressComponents = place.address_components;
              console.log('📍 Address components:', addressComponents); // Debug log
              console.log('📍 Number of components:', addressComponents.length); // Debug log
              
              let streetNumber = '';
              let route = '';
              let city = '';
              let postalCode = '';
              let country = '';

              addressComponents.forEach((component: any, index: number) => {
                const types = component.types;
                console.log(`🏷️ Component ${index}: "${component.long_name}" | Types: [${types.join(', ')}]`); // Debug log
                
                if (types.includes('street_number')) {
                  streetNumber = component.long_name;
                  console.log('🏠 Street number found:', streetNumber);
                }
                if (types.includes('route')) {
                  route = component.long_name;
                  console.log('🛣️ Route found:', route);
                }
                // Προσθέτω περισσότερους τύπους για καλύτερη ανίχνευση πόλης
                if (types.includes('locality') || 
                    types.includes('administrative_area_level_3') ||
                    types.includes('administrative_area_level_2') ||
                    types.includes('sublocality_level_1')) {
                  city = component.long_name;
                  console.log('🏙️ City found:', city, 'from type:', types.find((t: string) => t.includes('locality') || t.includes('administrative') || t.includes('sublocality')));
                }
                if (types.includes('postal_code')) {
                  postalCode = component.long_name;
                  console.log('📮 Postal code found:', postalCode);
                }
                if (types.includes('country')) {
                  country = component.long_name;
                  console.log('🌍 Country found:', country);
                }
              });

              console.log('🎯 Final parsed data:', { streetNumber, route, city, postalCode, country }); // Debug log

              const fullAddress = place.formatted_address || `${route} ${streetNumber}`.trim();
              const coordinates = place.geometry?.location ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              } : undefined;

              const addressData = {
                fullAddress,
                city,
                postalCode,
                country,
                coordinates
              };

              console.log('📤 Final address data to send:', addressData); // Debug log

              setInputValue(fullAddress);
              
              console.log('🚀 Calling onAddressSelect with:', addressData); // Debug log
              onAddressSelect(addressData);
              console.log('✅ onAddressSelect called successfully'); // Debug log
            });

            setIsLoaded(true);
            setError('');
            console.log('✅ PlaceAutocompleteElement initialized successfully'); // Debug log
          } catch (err) {
            console.error('Error initializing PlaceAutocompleteElement:', err);
            setError('Σφάλμα αρχικοποίησης Google Maps autocomplete');
            isInitializedRef.current = false; // Reset σε περίπτωση error
          }
        } else if (window.google?.maps?.places?.Autocomplete) {
          // Fallback στο legacy API (θα εμφανίσει warning)
          console.warn('Χρήση legacy Autocomplete API - συνίσταται αναβάθμιση');
          
          const autocompleteInstance = new window.google.maps.places.Autocomplete(
            inputRef.current,
            {
              componentRestrictions: { country: 'gr' },
              types: ['address'],
              fields: ['address_components', 'formatted_address', 'geometry']
            }
          );

          autocompleteInstance.addListener('place_changed', () => {
            const place = autocompleteInstance.getPlace();
            
            if (!place.address_components || !place.formatted_address) {
              setError('Παρακαλώ επιλέξτε μια έγκυρη διεύθυνση από τη λίστα.');
              return;
            }

            // Parse address components για legacy API
            const addressComponents = place.address_components;
            let streetNumber = '';
            let route = '';
            let city = '';
            let postalCode = '';
            let country = '';

            addressComponents.forEach((component: any) => {
              const types = component.types;
              
              if (types.includes('street_number')) {
                streetNumber = component.long_name;
              }
              if (types.includes('route')) {
                route = component.long_name;
              }
              if (types.includes('locality') || types.includes('administrative_area_level_3')) {
                city = component.long_name;
              }
              if (types.includes('postal_code')) {
                postalCode = component.long_name;
              }
              if (types.includes('country')) {
                country = component.long_name;
              }
            });

            const fullAddress = `${route}${streetNumber ? ' ' + streetNumber : ''}`.trim();
            const coordinates = place.geometry?.location ? {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            } : undefined;

            setInputValue(fullAddress || place.formatted_address);
            onAddressSelect({
              fullAddress: fullAddress || place.formatted_address,
              city,
              postalCode,
              country,
              coordinates
            });
          });

          setIsLoaded(true);
        } else {
          setError('Google Maps Places API δεν είναι διαθέσιμο');
          isInitializedRef.current = false; // Reset σε περίπτωση error
        }
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
        setError('Σφάλμα φόρτωσης Google Maps. Ελέγξτε τη σύνδεσή σας.');
        isInitializedRef.current = false; // Reset σε περίπτωση error
      });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up AddressAutocomplete...');
      if (autocompleteElementRef.current && autocompleteElementRef.current.parentNode) {
        autocompleteElementRef.current.parentNode.removeChild(autocompleteElementRef.current);
        autocompleteElementRef.current = null;
      }
      isInitializedRef.current = false; // Reset για την επόμενη φορά
    };
  }, [onAddressSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="address">
        <MapPin className="inline w-4 h-4 mr-1" />
        Διεύθυνση {required && '*'}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id="address"
          name="address"
          value={inputValue}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={isLoaded ? "Αρχίστε να πληκτρολογείτε τη διεύθυνση..." : "Φόρτωση Google Maps..."}
          required={required && !isLoaded} // Required μόνο όταν το Google Maps δεν έχει φορτώσει
          disabled={!isLoaded && !error}
        />
        
        {/* Hidden input για validation όταν το Google Maps element είναι ενεργό */}
        {isLoaded && autocompleteElementRef.current && (
          <input
            type="hidden"
            name="address_validation"
            value={inputValue}
            required={required}
          />
        )}
        
        {!isLoaded && !error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}
      
      {isLoaded && !error && (
        <p className="mt-1 text-xs text-gray-500">
          Προτεινόμενες διευθύνσεις από Google Maps
        </p>
      )}
    </div>
  );
};

export default AddressAutocomplete; 