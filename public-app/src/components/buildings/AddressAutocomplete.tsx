'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onLocationChange?: (lat: number, lng: number) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onLocationChange,
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

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [onChange, onLocationChange]);

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

