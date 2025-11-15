'use client';

import { useState, useRef, useEffect } from 'react';
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

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    // Load Google Maps script if not already loaded
    const loadGoogleMapsScript = () => {
      if (typeof window === 'undefined') return;
      
      // Check if script is already loaded
      if (window.google?.maps?.places) {
        initializeAutocomplete();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Wait for script to load
        existingScript.addEventListener('load', initializeAutocomplete);
        return;
      }

      // Load the script
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('[AddressAutocomplete] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeAutocomplete;
      script.onerror = () => {
        console.error('[AddressAutocomplete] Failed to load Google Maps script');
      };
      document.head.appendChild(script);
    };

    const initializeAutocomplete = () => {
      // Initialize Google Places Autocomplete if available
      if (
        typeof window !== 'undefined' &&
        window.google?.maps?.places &&
        inputRef.current &&
        !autocompleteRef.current
      ) {
        try {
        const autocomplete = new window.google.maps.places.Autocomplete(
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
        console.warn('[AddressAutocomplete] Google Places API not available:', error);
      }
      }
    };

    loadGoogleMapsScript();

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [onChange, onLocationChange, onAddressDetailsChange]);

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
      {typeof window !== 'undefined' && !window.google?.maps?.places && (
        <p className="text-xs text-gray-500">
          💡 Για αυτόματη συμπλήρωση διεύθυνσης, προσθέστε Google Maps API key
        </p>
      )}
    </div>
  );
}


