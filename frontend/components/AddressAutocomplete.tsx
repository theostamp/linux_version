"use client"

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';

interface AddressAutocompleteProps {
  onAddressSelect: (addressDetails: {
    address: string;
    city: string;
    postal_code: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }) => void;
  value?: string;
  required?: boolean;
}

// Google Maps Script Loader
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places?.PlaceAutocompleteElement) {
      console.log('✅ Google Maps already loaded with Places API');
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('📜 Existing Google Maps script found, waiting for load...');
      existingScript.addEventListener('load', () => {
        setTimeout(() => {
          if (window.google?.maps?.places?.PlaceAutocompleteElement) {
            console.log('✅ Places API loaded from existing script');
            resolve();
          } else {
            console.error('❌ Places API not available from existing script');
            reject(new Error('Places API not available'));
          }
        }, 1000);
      });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    console.log('📜 Creating new Google Maps script...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('📜 Google Maps script loaded, waiting for Places API...');
      setTimeout(() => {
        if (window.google?.maps?.places?.PlaceAutocompleteElement) {
          console.log('✅ Places API initialized successfully');
          resolve();
        } else {
          console.error('❌ Places API failed to initialize');
          reject(new Error('Places API failed to initialize'));
        }
      }, 2000);
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
};

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ onAddressSelect, value = '', required = false }) => {
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  
  const inputRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('Google Maps API key is missing');
      return;
    }

    if (isInitializedRef.current) return;

    console.log('🚀 Initializing AddressAutocomplete...');
    isInitializedRef.current = true;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        console.log('✅ Google Maps script loaded successfully');
        
        if (!inputRef.current) {
          console.log('🛑 Component unmounted before initialization');
          return;
        }

        try {
          // Functions for handling place data
          const processPlace = (place: any) => {
            console.log('🏗️ Processing place data:', place);
            
            // Use safer boolean evaluation to avoid crashes
            const hasAddressComponents = Boolean(place.address_components && Array.isArray(place.address_components) && place.address_components.length > 0);
            const hasAddressComponentsNew = Boolean(place.addressComponents && Array.isArray(place.addressComponents) && place.addressComponents.length > 0);
            
            console.log('🧪 TESTING: hasAddressComponents =', hasAddressComponents, 'hasAddressComponentsNew =', hasAddressComponentsNew);
            const shouldGetDetails = !hasAddressComponents && !hasAddressComponentsNew;
            console.log('🧪 TESTING: shouldGetDetails =', shouldGetDetails);
            
            console.log('⚡ ABOUT TO ENTER IF STATEMENT - this should ALWAYS appear!');
            
            if (shouldGetDetails) {
                          console.log('🚨 ENTERING IF CONDITION - need to get more details');
            console.log('🔄 Using new Places API to get place details...');
            
            try {
              // Get place_id from the place object - need to extract the actual string
              let placeId = place.place_id || place.Oq;
              console.log('🆔 Raw Place ID found:', placeId);
              
              // If placeId is an object, try to extract the actual ID
              if (typeof placeId === 'object' && placeId) {
                // The object might have different properties, let's inspect it
                console.log('🔍 PlaceId is object, inspecting:', Object.keys(placeId));
                // Common properties that might contain the actual ID
                placeId = placeId.place_id || placeId.id || placeId.placeId || placeId.toString();
                console.log('🆔 Extracted Place ID:', placeId);
              }
              
                             // Check if we got a proper place_id format
               const isValidPlaceId = placeId && typeof placeId === 'string' && 
                                     placeId.length < 200 && !placeId.includes(',');
               
               if (!isValidPlaceId) {
                 console.log('❌ No valid place_id found (too long/complex or not string)');
                 console.log('🔄 Using fallback - processing place object directly...');
                 
                 // For now, let's try to extract some basic info from what we have
                 if (place && typeof place === 'object') {
                   console.log('🏗️ Processing place object directly (fallback)...');
                   console.log('📍 Available place properties:', Object.keys(place));
                   
                                     // Extract address from the complex placeId string
                  let extractedAddress = 'Διεύθυνση δεν βρέθηκε';
                  let extractedCity = '';
                  let extractedPostalCode = '';
                  
                  if (typeof placeId === 'string' && placeId.includes('Ελλάδα')) {
                    // Debug: Let's see what we're working with
                    console.log('🔍 Searching for address in placeId. Full string:', placeId);
                    
                    // The address is hidden in the placeId - try multiple patterns
                    let addressMatch = placeId.match(/([Α-Ωα-ωάέήίόύώΐΰ\s\-\.]+\s+\d+[Α-Ωα-ωάέήίόύώΐΰ\s\-\.]*,\s*[Α-Ωα-ωάέήίόύώΐΰ\s\-\.]+,\s*Ελλάδα)/);
                    
                    // Fallback to original pattern if the new one doesn't work
                    if (!addressMatch) {
                      console.log('🔄 First regex failed, trying fallback pattern...');
                      addressMatch = placeId.match(/([Α-Ωα-ωάέήίόύώ\s]+\s+\d+[Α-Ωα-ωάέήίόύώ]*,\s*[Α-Ωα-ωάέήίόύώ\s]+,\s*Ελλάδα)/);
                    }
                    
                    // Even more flexible fallback - just look for any Greek text + number + comma + Greek text + comma + Ελλάδα
                    if (!addressMatch) {
                      console.log('🔄 Second regex failed, trying very flexible pattern...');
                      addressMatch = placeId.match(/([^,]+\d+[^,]*,\s*[^,]+,\s*Ελλάδα)/);
                    }
                    
                    if (addressMatch) {
                      extractedAddress = addressMatch[1];
                      console.log('🔍 Extracted address from placeId:', extractedAddress);
                      
                      // Try to extract city from the address format: "Street Number, City, Country"
                      const cityMatch = extractedAddress.match(/,\s*([Α-Ωα-ωάέήίόύώΐΰ\s\-\.]+),\s*Ελλάδα/);
                      if (cityMatch) {
                        extractedCity = cityMatch[1].trim();
                        console.log('🏙️ Extracted city:', extractedCity);
                      }
                      
                      // Look for postal code in the placeId string (multiple strategies)
                      let postalMatch = placeId.match(/(\d{3}\s*\d{2}|\d{5})/g);
                      if (postalMatch && postalMatch.length > 0) {
                        // Take the first valid postal code found
                        extractedPostalCode = postalMatch[0];
                        // Format the postal code properly (add space if needed)
                        if (extractedPostalCode.length === 5 && !extractedPostalCode.includes(' ')) {
                          extractedPostalCode = extractedPostalCode.substring(0, 3) + ' ' + extractedPostalCode.substring(3);
                        }
                        console.log('📮 Extracted postal code:', extractedPostalCode);
                      } else {
                        // Fallback: look for any 5-digit number that might be a postal code
                        console.log('🔍 Searching for postal code in full placeId string...');
                        console.log('📄 Full placeId for postal code search:', placeId);
                      }
                    }
                  }
                  
                  // Try to create a minimal address object from available data
                  const fallbackAddress = {
                    formatted_address: place.formatted_address || place.QB || extractedAddress,
                    geometry: place.geometry,
                    place_id: placeId
                  };
                  
                  const addressData = {
                    fullAddress: fallbackAddress.formatted_address,
                    city: extractedCity,
                    postalCode: extractedPostalCode,
                    country: 'Ελλάδα'
                  };
                  
                  console.log('✅ Address selected:', addressData.fullAddress);
                  onAddressSelect(addressData);
                 }
                 return;
               }
              
              // Use the new Place API
              const { Place } = window.google.maps.places;
              const placeRequest = new Place({
                id: placeId,
                requestedLanguage: 'el'
              });
              
              console.log('🔄 Fetching place details with new Place API...');
              
              placeRequest.fetchFields({
                fields: ['id', 'displayName', 'formattedAddress', 'addressComponents', 'location']
              }).then((result: any) => {
                console.log('✅ Detailed place fetched via new Place API:', result);
                console.log('📍 Place details:', result.place);
                
                if (result.place) {
                  processAddressComponents(result.place);
                } else {
                  console.log('❌ No place data in result');
                }
              }).catch((error: any) => {
                console.log('❌ Error with new Place API:', error);
              });
              
            } catch (error) {
              console.log('❌ Error with Places API:', error);
            }
            return;
            }
            
            console.log('🔥 IMMEDIATELY AFTER IF BLOCK - this should appear when shouldGetDetails=false!');
            console.log('🔍 SKIPPING IF CONDITION - place has address components!');
            
            // Process address components
            processAddressComponents(place);
          };

          const processAddressComponents = (place: any) => {
            console.log('📦 processAddressComponents CALLED!');
            console.log('📦 Processing address components for place:', place.formatted_address || 'Unknown');

            const addressComponents = place.address_components || place.addressComponents;
            console.log('📍 Address components:', addressComponents);

            if (!addressComponents) {
              console.error('❌ No address components found in place object');
              return;
            }

            // Parse address components
            let streetNumber = '';
            let route = '';
            let city = '';
            let postalCode = '';
            let country = '';

            addressComponents.forEach((component: any) => {
              const types = component.types || [];
              if (types.includes('street_number')) {
                streetNumber = component.long_name || component.short_name || '';
              } else if (types.includes('route')) {
                route = component.long_name || component.short_name || '';
              } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                city = component.long_name || component.short_name || '';
              } else if (types.includes('postal_code')) {
                postalCode = component.long_name || component.short_name || '';
              } else if (types.includes('country')) {
                country = component.long_name || component.short_name || '';
              }
            });

            // Construct full address
            const fullAddress = `${streetNumber} ${route}`.trim();
            console.log('📍 Parsed address components:', { streetNumber, route, city, postalCode, country, fullAddress });

            // Call the callback
            console.log('🚀 Calling onAddressSelect with parsed data');
            onAddressSelect({
              address: fullAddress,
              city: city,
              postal_code: postalCode,
              country: country
            });

            console.log('✅ Address selection completed successfully!');
            setShowWarning(false);
          };

          // Create autocomplete element
          if (window.google?.maps?.places?.PlaceAutocompleteElement) {
            console.log('🏗️ Creating new PlaceAutocompleteElement...');
            
            const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
              componentRestrictions: { country: 'gr' },
              types: ['address']
            });
            
            console.log('⚙️ Creating PlaceAutocompleteElement with options:', {
              componentRestrictions: { country: 'gr' },
              types: ['address']
            });

            console.log('✅ PlaceAutocompleteElement created:', autocompleteElement);

            // Event listeners with comprehensive debugging
            console.log('🎧 Adding event listeners to autocompleteElement...');
            
            autocompleteElement.addEventListener('gmp-placeselect', (event: any) => {
              console.log('🎯 EVENT FIRED: gmp-placeselect with event:', event);
              console.log('🎯 Event type:', event.type);
              console.log('🎯 Event detail:', event.detail);
              console.log('🎯 Event target:', event.target);
              console.log('🎯 Event currentTarget:', event.currentTarget);
              
              const place = event.place || event.Dg;
              if (place) {
                console.log('🗺️ Final selected place from Google Maps:', place);
                processPlace(place);
              } else {
                console.log('❌ No place found in event:', event);
              }
            });

            // Add more event listeners for debugging
            autocompleteElement.addEventListener('gmp-placechange', (event: any) => {
              console.log('🔄 gmp-placechange event fired:', event);
            });

            // Try alternative event names that might be used
            ['gmp-select', 'place_changed', 'places_changed'].forEach(eventName => {
              autocompleteElement.addEventListener(eventName, (event: any) => {
                console.log(`🎪 Event dispatched on autocomplete element: ${eventName}`, event);
                
                // ΚΥΡΙΟΣ HANDLER ΓΙΑ ΤΟ gmp-select EVENT
                if (eventName === 'gmp-select') {
                  console.log('🎯 HANDLING gmp-select event!');
                  console.log('🎯 Event.Dg (place):', event.Dg);
                  console.log('🎯 Event.place:', event.place);
                  
                  const place = event.Dg || event.place;
                  if (place) {
                    console.log('🏠 Found place in gmp-select event, calling processPlace:', place);
                    processPlace(place);
                  } else {
                    console.log('❌ No place found in gmp-select event');
                  }
                }
              });
            });

            autocompleteElement.addEventListener('input', (event: any) => {
              console.log('📝 Input event fired:', event);
              
              // Check if predictions are available after a short delay
              setTimeout(() => {
                const predictions = autocompleteElement.predictions || [];
                console.log('🔮 Predictions available after input:', predictions.length, predictions);
                
                if (predictions.length === 0) {
                  console.log('⚠️ No predictions found - Google Maps might not recognize this input');
                }
              }, 500);
            });

            // Listen for any events on the element
            ['click', 'focus', 'blur', 'keydown', 'keyup'].forEach(eventType => {
              autocompleteElement.addEventListener(eventType, (event: any) => {
                console.log(`👆 ${eventType} event fired:`, event);
                
                // Special handling for selection events
                if (eventType === 'click' || (eventType === 'keydown' && event.key === 'Enter')) {
                  console.log('🎯 Potential selection detected!');
                  
                  // Try to get the selected place
                  setTimeout(() => {
                    if (autocompleteElement.place) {
                      console.log('🏠 Found selected place via autocompleteElement.place:', autocompleteElement.place);
                      processPlace(autocompleteElement.place);
                    } else {
                      console.log('❌ No place found on autocompleteElement.place');
                    }
                  }, 100);
                }
              });
            });

            console.log('✅ All event listeners added');

            // Add to DOM
            if (inputRef.current) {
              inputRef.current.innerHTML = '';
              inputRef.current.appendChild(autocompleteElement);
              autocompleteElementRef.current = autocompleteElement;
              console.log('✅ PlaceAutocompleteElement initialized successfully');
            }
          }

          console.log('✅ Functions defined successfully');
          
        } catch (error) {
          console.error('Error in Google Maps initialization:', error);
        }
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
        setError('Σφάλμα φόρτωσης Google Maps. Ελέγξτε τη σύνδεσή σας.');
      });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up AddressAutocomplete...');
      if (autocompleteElementRef.current) {
        autocompleteElementRef.current = null;
      }
      isInitializedRef.current = false;
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
      
      {showWarning && (
        <div className="flex items-center text-amber-600 text-sm mb-2">
          <AlertCircle className="w-4 h-4 mr-1" />
          ⚠️ Δεν έχει επιλεχθεί διεύθυνση
        </div>
      )}
      
      <div 
        ref={inputRef}
        className="w-full"
        style={{ minHeight: '40px' }}
      />
      
      {error && (
        <div className="flex items-center text-red-600 text-sm mt-1">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}
      

    </div>
  );
};

export default AddressAutocomplete; 