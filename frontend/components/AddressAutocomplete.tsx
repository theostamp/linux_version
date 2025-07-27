"use client"

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle, ChevronDown } from 'lucide-react';

interface AddressAutocompleteProps {
  onAddressSelect: (addressDetails: {
    fullAddress: string;           // Primary property for forms
    address: string;              // Backward compatibility  
    city: string;
    postalCode: string;           // Primary property for forms
    postal_code: string;          // Backward compatibility
    country: string;
    coordinates?: { lat: number; lng: number };
  }) => void;
  value?: string;
  required?: boolean;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

// Google Maps Script Loader for NEW Places API
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places?.PlacesService) {
      console.log('✅ Google Maps already loaded with NEW Places API');
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('📜 Existing Google Maps script found, waiting for NEW Places API load...');
      existingScript.addEventListener('load', () => {
        setTimeout(() => {
          if (window.google?.maps?.places?.PlacesService) {
            console.log('✅ NEW Places API loaded from existing script');
            resolve();
          } else {
            console.error('❌ NEW Places API not available from existing script');
            reject(new Error('NEW Places API not available'));
          }
        }, 1000);
      });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    console.log('📜 Creating new Google Maps script for NEW Places API...');
    const script = document.createElement('script');
    // IMPORTANT: Use v=weekly to ensure we get the latest Places API with new features
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('📜 Google Maps script loaded, waiting for NEW Places API...');
      setTimeout(() => {
        if (window.google?.maps?.places?.PlacesService) {
          console.log('✅ NEW Places API initialized successfully');
          resolve();
        } else {
          console.error('❌ NEW Places API failed to initialize');
          reject(new Error('NEW Places API failed to initialize'));
        }
      }, 2000);
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
};

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ onAddressSelect, value = '', required = false }) => {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('Google Maps API key is missing');
      return;
    }

    if (isInitializedRef.current) return;

    console.log('🚀 Initializing Editable AddressAutocomplete...');
    isInitializedRef.current = true;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        console.log('✅ Google Maps script loaded successfully');
        
        if (window.google?.maps?.places) {
          // Initialize AutocompleteService for getting predictions
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          
          // Create a dummy div for PlacesService (required by Google Maps API)
          const dummyDiv = document.createElement('div');
          placesService.current = new window.google.maps.places.PlacesService(dummyDiv);
          
          console.log('✅ Places services initialized successfully');
        }
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
        setError('Σφάλμα φόρτωσης Google Maps. Ελέγξτε τη σύνδεσή σας.');
      });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up AddressAutocomplete...');
      isInitializedRef.current = false;
    };
  }, []);

  // Debounced function to get predictions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue.length > 2 && autocompleteService.current) {
        getPredictions(inputValue);
      } else {
        setPredictions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  const getPredictions = (input: string) => {
    if (!autocompleteService.current) return;

    setIsLoading(true);
    
    const request = {
      input: input,
      componentRestrictions: { country: 'gr' },
      types: ['address']
    };

    autocompleteService.current.getPlacePredictions(request, (predictions: any, status: any) => {
      setIsLoading(false);
      
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        console.log('🔮 Got predictions:', predictions.length);
        setPredictions(predictions);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else {
        console.log('⚠️ No predictions found or error:', status);
        setPredictions([]);
        setShowSuggestions(false);
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          selectPrediction(predictions[selectedIndex]);
        } else if (predictions.length > 0) {
          // If no specific selection, use the first prediction
          selectPrediction(predictions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectPrediction = (prediction: Prediction) => {
    console.log('🎯 Selected prediction:', prediction);
    
    setInputValue(prediction.description);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    // Get place details for the selected prediction
    getPlaceDetails(prediction.place_id);
  };

  const getPlaceDetails = (placeId: string) => {
    if (!placesService.current) {
      console.error('❌ PlacesService not initialized');
      return;
    }

    console.log('🔍 Getting place details for:', placeId);
    
    const request = {
      placeId: placeId,
      fields: ['address_components', 'formatted_address', 'geometry', 'name']
    };

    placesService.current.getDetails(request, (place: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        console.log('✅ Place details received:', place);
        processPlaceDetails(place);
      } else {
        console.error('❌ Error getting place details:', status);
      }
    });
  };

  const processPlaceDetails = (place: any) => {
    console.log('📦 Processing place details:', place);

    const addressComponents = place.address_components || [];
    
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
    const fullAddress = place.formatted_address || `${streetNumber} ${route}`.trim();
    
    console.log('📍 Parsed address components:', { 
      streetNumber, route, city, postalCode, country, fullAddress 
    });

    // Create address data object with correct property names for form compatibility
    const addressData = {
      fullAddress: fullAddress,       // CreateBuildingForm expects 'fullAddress'
      address: fullAddress,           // Also provide 'address' for backward compatibility  
      city: city,
      postalCode: postalCode,         // CreateBuildingForm expects 'postalCode'
      postal_code: postalCode,        // Also provide 'postal_code' for backward compatibility
      country: country,
      coordinates: place.geometry?.location ? {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      } : undefined
    };
    
    console.log('📤 Address data being sent to form:', addressData);
    onAddressSelect(addressData);
    
    console.log('✅ Address selection completed successfully!');
  };

  const handleSuggestionClick = (prediction: Prediction) => {
    selectPrediction(prediction);
  };

  const handleFocus = () => {
    if (predictions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
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
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Πληκτρολογήστε διεύθυνση και πατήστε Enter για επιλογή..."
          required={required}
          autoComplete="off"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Dropdown indicator */}
        {!isLoading && showSuggestions && predictions.length > 0 && (
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && predictions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {predictions.map((prediction, index) => (
            <div
              key={prediction.place_id}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSuggestionClick(prediction)}
            >
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {prediction.structured_formatting ? (
                    <>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {prediction.structured_formatting.main_text}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {prediction.structured_formatting.secondary_text}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-900">
                      {prediction.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <div className="flex items-center text-red-600 text-sm mt-1">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}
      
      {/* Helper text */}
      <p className="mt-1 text-xs text-gray-500">
        💡 Πληκτρολογήστε τη διεύθυνση, επιλέξτε με ↑↓ και πατήστε Enter
      </p>
    </div>
  );
};

export default AddressAutocomplete; 