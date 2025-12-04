'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onLocationChange?: (lat: number, lng: number) => void;
  onAddressDetailsChange?: (details: {
    address: string;
    city: string;
    postal_code: string;
    country: string;
  }) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onLocationChange,
  onAddressDetailsChange,
  label = 'Διεύθυνση',
  placeholder = 'Εισάγετε διεύθυνση...',
  required = false,
  disabled = false,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const initAttemptedRef = useRef(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const initializeAutocomplete = useCallback(async () => {
    // Prevent multiple initializations
    if (autocompleteRef.current || initAttemptedRef.current) {
      return;
    }

    // Check if we have a valid input element
    const inputElement = inputRef.current;
    if (!inputElement) {
      return;
    }

    // Verify it's actually an HTMLInputElement
    if (!(inputElement instanceof HTMLInputElement)) {
      console.warn('[AddressAutocomplete] inputRef.current is not an HTMLInputElement');
      return;
    }

    // Check if Google Maps is available
    if (typeof window === 'undefined' || !window.google?.maps) {
      return;
    }

    try {
      initAttemptedRef.current = true;
      
      let AutocompleteConstructor: typeof google.maps.places.Autocomplete | undefined;

      // Try using importLibrary (preferred for loading=async)
      if (window.google?.maps?.importLibrary) {
        try {
          const placesLib = (await window.google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
          AutocompleteConstructor = placesLib.Autocomplete;
        } catch (err) {
          console.warn('[AddressAutocomplete] importLibrary("places") failed:', err);
        }
      }

      // Fallback to global namespace
      if (!AutocompleteConstructor && window.google?.maps?.places?.Autocomplete) {
        AutocompleteConstructor = window.google.maps.places.Autocomplete;
      }

      if (!AutocompleteConstructor) {
        console.warn('[AddressAutocomplete] Autocomplete constructor not available');
        initAttemptedRef.current = false; // Allow retry
        return;
      }

      // Double-check input is still valid before creating Autocomplete
      if (!inputRef.current || !(inputRef.current instanceof HTMLInputElement)) {
        console.warn('[AddressAutocomplete] Input element no longer valid');
        initAttemptedRef.current = false;
        return;
      }

      const autocomplete = new AutocompleteConstructor(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'gr' }, // Restrict to Greece
        }
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place.formatted_address) {
          setInputValue(place.formatted_address);
          onChange(place.formatted_address);
        }

        // Extract address components
        let city = '';
        let postalCode = '';
        let country = 'Ελλάδα';
        let streetAddress = place.formatted_address || '';

        if (place.address_components) {
          for (const component of place.address_components) {
            const types = component.types;
            
            if (types.includes('locality') || types.includes('administrative_area_level_2')) {
              city = component.long_name;
            }
            
            if (types.includes('postal_code')) {
              postalCode = component.long_name;
            }
            
            if (types.includes('country')) {
              country = component.long_name;
            }
          }
        }

        // Extract street address (without city/postal code)
        if (place.formatted_address) {
          const parts = place.formatted_address.split(',');
          if (parts.length > 0) {
            streetAddress = parts[0].trim();
          }
        }

        // Call onAddressDetailsChange if provided
        if (onAddressDetailsChange) {
          onAddressDetailsChange({
            address: streetAddress,
            city: city,
            postal_code: postalCode,
            country: country,
          });
        }

        if (place.geometry?.location && onLocationChange) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          onLocationChange(lat, lng);
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.warn('[AddressAutocomplete] Error initializing Google Places Autocomplete:', error);
      initAttemptedRef.current = false; // Allow retry on error
    }
  }, [onChange, onLocationChange, onAddressDetailsChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Wait for DOM to be ready and input to be mounted
    const timeoutId = setTimeout(() => {
      // Check if Google Maps is already loaded (from global script in layout.tsx)
      if (window.google?.maps) {
        initializeAutocomplete();
        return;
      }

      // If not loaded yet, wait for it
      const checkGoogleMaps = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkGoogleMaps);
          initializeAutocomplete();
        }
      }, 200);

      // Clear interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogleMaps), 10000);
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      if (autocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
        } catch {
          // Ignore cleanup errors
        }
        autocompleteRef.current = null;
      }
      initAttemptedRef.current = false;
    };
  }, [initializeAutocomplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="address-input">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        id="address-input"
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}
