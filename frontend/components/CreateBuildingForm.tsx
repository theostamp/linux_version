// frontend/components/CreateBuildingForm.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import { createBuilding, updateBuilding } from '@/lib/api';
import { Building } from '@/types/building';
import AddressAutocomplete from './AddressAutocomplete';
import StreetViewImage from './StreetViewImage';
import { 
  Save, 
  Loader2, 
  MapPin, 
  Camera,
  Building as BuildingIcon,
  Info
} from 'lucide-react';

interface Props {
  initialData?: Partial<Building>;
  onSuccessPath?: string;
  submitText: string;
  buildingId?: number;
}

interface BuildingFormData {
  name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  apartments_count?: number;
  internal_manager_name?: string;
  internal_manager_phone?: string;
  management_office_name?: string;
  management_office_phone?: string;
  management_office_address?: string;
  street_view_image?: string;
  latitude?: number | string;
  longitude?: number | string;
  coordinates?: { lat: number; lng: number };
}

export default function CreateBuildingForm({
  initialData = {},
  onSuccessPath = '/buildings',
  submitText,
  buildingId,
}: Readonly<Props>) {
  const router = useRouter();
  const { setBuildings, refreshBuildings } = useBuilding();
  const { user } = useAuth();
  const [form, setForm] = useState<BuildingFormData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>(
    initialData.coordinates
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Special handling for postal_code field
    let processedValue = value;
    if (name === 'postal_code') {
      // Remove spaces and non-numeric characters
      processedValue = value.replace(/\s/g, '').replace(/[^0-9]/g, '');
      // Limit to 5 digits
      processedValue = processedValue.slice(0, 5);
    }
    
    setForm((prev) => ({
      ...prev,
      [name]: name === 'apartments_count' ? Number(processedValue) : processedValue,
    }));
  };

  const handleAddressSelect = useCallback((addressData: {
    fullAddress: string; // Added fullAddress
    address: string;
    city: string;
    postalCode: string; // Added postalCode
    postal_code: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }, isConfirmed?: boolean) => { // Added isConfirmed
    // Auto-populate building name from address if not already set
    setForm((prev) => {
      // Clean postal code - remove spaces and ensure 5 digits format
      let cleanPostalCode = (addressData.postalCode || addressData.postal_code || '').replace(/\s/g, '');
      
      // Ensure postal code is exactly 5 digits
      if (cleanPostalCode.length === 5 && /^\d{5}$/.test(cleanPostalCode)) {
        // Valid 5-digit postal code
      } else if (cleanPostalCode.length === 6 && /^\d{3}\d{3}$/.test(cleanPostalCode)) {
        // Format like "123 456" - remove space
        cleanPostalCode = cleanPostalCode.replace(/(\d{3})(\d{3})/, '$1$2');
      } else {
        // Invalid format, keep as is for user to correct
        cleanPostalCode = (addressData.postalCode || addressData.postal_code || '');
      }

      const updatedForm = {
        ...prev,
        address: addressData.fullAddress, // Use fullAddress as the main address
        city: addressData.city,
        postal_code: cleanPostalCode,
      };

      // Auto-populate building name from address EVERY time user confirms an address
      // This provides a consistent and user-friendly experience
      if (addressData.fullAddress) {
        // Create a concise building name: "Διεύθυνση, Αριθμός" (without postal code and country)
        let buildingName = '';
        
        // Start with the street address (which includes the number)
        if (addressData.address) {
          buildingName = addressData.address;
        }
        
        // If we don't have an address, try to extract from fullAddress
        if (!buildingName && addressData.fullAddress) {
          const addressParts = addressData.fullAddress.split(',');
          if (addressParts.length > 0) {
            // Take only the first part (street + number) and clean it
            buildingName = addressParts[0].trim();
          }
        }
        
        // Clean up the building name - remove postal code and country references
        if (buildingName) {
          // Split by commas and take only the first two parts (street + city)
          const parts = buildingName.split(',').map(part => part.trim());
          
          // Keep only street and city, remove postal code and country
          if (parts.length >= 2) {
            // Take street (first part) and city (second part)
            buildingName = `${parts[0]}, ${parts[1]}`;
          } else if (parts.length === 1) {
            // If only one part, keep it as is
            buildingName = parts[0];
          }
          
          // Additional cleanup - remove any remaining postal codes (5 digits)
          buildingName = buildingName.replace(/\s+\d{5}\s*/, '').trim();
          // Remove common country names
          buildingName = buildingName.replace(/\b(Greece|Ελλάδα)\b/gi, '').trim();
          // Remove extra commas and spaces
          buildingName = buildingName.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/\s*,$/, '').trim();
        }
        
        if (buildingName) {
          updatedForm.name = buildingName;
        }
      }

      return updatedForm;
    });

    if (addressData.coordinates) {
      setCoordinates(addressData.coordinates);
    }
  }, []);

  const handleStreetViewImageSelect = (imageUrl: string) => {
    setForm((prev) => ({
      ...prev,
      street_view_image: imageUrl,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    const missingFields: string[] = [];
    
    // Basic required fields
    if (!form.name) missingFields.push('όνομα κτιρίου');
    if (!form.apartments_count) missingFields.push('αριθμός διαμερισμάτων');
    
    // Validation for Google Maps mode
    if (useGoogleMaps) {
      if (!form.address || !form.city || !form.postal_code) {
        if (!form.address) missingFields.push('διεύθυνση');
        if (!form.city) missingFields.push('πόλη');  
        if (!form.postal_code) missingFields.push('ταχυδρομικός κώδικας');
      }
    }
    
    if (missingFields.length > 0) {
      const errorMessage = `Παρακαλώ συμπληρώστε τα υποχρεωτικά πεδία: ${missingFields.join(', ')}`;
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
      return;
    }
    
    // Προετοιμασία δεδομένων για αποστολή
    const formData = { ...form };
    
    // Προσθήκη συντεταγμένων αν υπάρχουν
    if (coordinates && coordinates.lat && coordinates.lng) {
      // Try sending as numbers first, then as strings if that doesn't work
      formData.latitude = coordinates.lat;
      formData.longitude = coordinates.lng;
      console.log('📍 Coordinates being added as numbers:', { lat: coordinates.lat, lng: coordinates.lng });
      console.log('📍 Formatted coordinates:', { latitude: formData.latitude, longitude: formData.longitude });
      // Pause 2s so the above logs remain visible in DevTools before navigation/rendering cycles
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      console.log('📍 No coordinates available, skipping coordinate fields');
      // Ensure coordinates are not sent if they don't exist
      delete formData.latitude;
      delete formData.longitude;
    }
    
    // Αφαιρούμε το street_view_image από το payload για το backend
    delete formData.street_view_image;
    delete formData.coordinates; // Αφαιρούμε το frontend coordinates field
    
    console.log('📤 Submitting building data:', formData);
    console.log('📤 Data types:', {
      latitude: typeof formData.latitude,
      longitude: typeof formData.longitude,
      name: typeof formData.name,
      address: typeof formData.address
    });
    console.log('📤 Raw formData object:', JSON.stringify(formData, null, 2));
    
    try {
      if (buildingId) {
        const updatedBuilding = await updateBuilding(buildingId, formData);
        toast.success('Το κτίριο ενημερώθηκε επιτυχώς');
        // Refresh buildings from server to ensure consistency
        await refreshBuildings();
      } else {
        const newBuilding = await createBuilding(formData);
        console.log('[CreateBuildingForm] New building created:', newBuilding);
        toast.success('Το κτίριο δημιουργήθηκε επιτυχώς');
        // Refresh buildings from server to ensure consistency
        await refreshBuildings();
      }
      router.push(onSuccessPath);
    } catch (e: any) {
      const errorMessage = e?.response?.data?.detail ?? e.message ?? 'Σφάλμα αποθήκευσης.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Βασικά Στοιχεία
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
              Όνομα Κτιρίου *
            </label>
            <input
              id="name"
              name="name"
              value={form.name ?? ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="π.χ. Οικοδομή Αθηνάς 25 (θα συμπληρωθεί αυτόματα από τη διεύθυνση)"
              required
            />
            {useGoogleMaps && (
              <p className="text-xs text-blue-600 mt-1">
                💡 Το όνομα του κτιρίου θα συμπληρωθεί αυτόματα όταν επιλέξετε διεύθυνση από το Google Maps
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="apartments_count">
              Αριθμός Διαμερισμάτων *
            </label>
            <select
              id="apartments_count"
              name="apartments_count"
              value={form.apartments_count ?? ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Επιλέξτε αριθμό</option>
              {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'διαμέρισμα' : 'διαμερίσματα'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Address Information with Google Maps Integration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 flex-1">
            Στοιχεία Διεύθυνσης
          </h3>
          <div className="flex items-center space-x-2 ml-4">
            <label className="text-sm text-gray-600">
              <input
                type="checkbox"
                checked={useGoogleMaps}
                onChange={(e) => setUseGoogleMaps(e.target.checked)}
                className="mr-2"
              />
              Google Maps
            </label>
          </div>
        </div>

        {useGoogleMaps ? (
          <>
            {/* Instructions for Google Maps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                📍 <strong>Οδηγίες:</strong> Αρχίστε να πληκτρολογείτε τη διεύθυνση, επιλέξτε με ↑↓ και πατήστε Enter. 
                Το όνομα του κτιρίου θα συμπληρωθεί αυτόματα από τη διεύθυνση που επιλέξετε.
              </p>
            </div>
            
            {/* Google Maps Address Autocomplete */}
            <AddressAutocomplete
              onAddressSelect={handleAddressSelect}
              value={form.address}
              required
            />
            
            {/* Display current values from form state */}
            {(form.address || form.city || form.postal_code) ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-800 font-medium">✅ Επιλεγμένη Διεύθυνση:</p>
                    <div className="text-xs text-green-700 mt-1 space-y-1">
                      {form.address && <p><strong>Διεύθυνση:</strong> {form.address}</p>}
                      {form.city && <p><strong>Πόλη:</strong> {form.city}</p>}
                      {form.postal_code && <p><strong>Τ.Κ.:</strong> {form.postal_code}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">⚠️ Δεν έχει επιλεχθεί διεύθυνση</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Πληκτρολογήστε τη διεύθυνση και επιλέξτε από τις προτάσεις του Google Maps
                    </p>
                  </div>
                </div>
              </div>
            )}

                        {/* Manual ΤΚ field for Google Maps mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="postal_code">
                Ταχυδρομικός Κώδικας *
              </label>
              <input
                id="postal_code"
                name="postal_code"
                value={form.postal_code ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. 10552 (5 ψηφία)"
                maxLength={5}
                pattern="[0-9]{5}"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Συμπληρώστε τον Τ.Κ. χειροκίνητα αν δεν συμπληρωθεί αυτόματα από το Google Maps. Μορφή: 5 ψηφία (π.χ. 10552)
              </p>
            </div>

            {/* Info about automatic building name update */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Σημείωση:</strong> Το όνομα του κτιρίου ενημερώνεται αυτόματα κάθε φορά που επιλέγετε διεύθυνση από το Google Maps (μόνο διεύθυνση και αριθμός, χωρίς ΤΚ και χώρα).
              </p>
            </div>

            {/* Street View Image Section */}
            {coordinates && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 flex items-center">
                  <Camera className="w-5 h-5 mr-2 text-blue-600" />
                  Εικόνα από το Street View
                </h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    🏙️ <strong>Οδηγίες:</strong> Περιστρέψτε την εικόνα με τα κουμπιά και επιλέξτε την επιθυμητή προβολή του κτιρίου.
                  </p>
                </div>
                
                <StreetViewImage
                  coordinates={coordinates}
                  address={form.address}
                  onImageSelect={handleStreetViewImageSelect}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Manual Address Input */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Χειροκίνητη εισαγωγή διεύθυνσης - Συμπληρώστε τα πεδία παρακάτω
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="address">
                Διεύθυνση *
              </label>
              <input
                id="address"
                name="address"
                value={form.address ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. Οδός Αθηνάς 25"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="city">
                  Πόλη *
                </label>
                <input
                  id="city"
                  name="city"
                  value={form.city ?? ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. Αθήνα"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="postal_code">
                  Ταχυδρομικός Κώδικας *
                </label>
                <input
                  id="postal_code"
                  name="postal_code"
                  value={form.postal_code ?? ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 10552 (5 ψηφία)"
                  maxLength={5}
                  pattern="[0-9]{5}"
                  required
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Manager Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Στοιχεία Διαχειριστή (Προαιρετικά)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="internal_manager_name">
              Όνομα Διαχειριστή
            </label>
            <input
              id="internal_manager_name"
              name="internal_manager_name"
              value={form.internal_manager_name ?? ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="π.χ. Γιάννης Παπαδόπουλος"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="internal_manager_phone">
              Τηλέφωνο Διαχειριστή
            </label>
            <input
              id="internal_manager_phone"
              name="internal_manager_phone"
              value={form.internal_manager_phone ?? ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="π.χ. 210-1234567"
              type="tel"
            />
          </div>
        </div>
      </div>

      {/* Management Office Information - Auto-filled from user settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Στοιχεία Γραφείου Διαχείρισης
        </h3>
        
        {user?.office_name || user?.office_phone || user?.office_address ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <BuildingIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-green-800 font-medium">✅ Αυτόματη συμπλήρωση από ρυθμίσεις χρήστη</p>
                <div className="text-xs text-green-700 mt-2 space-y-1">
                  {user.office_name && <p><strong>Γραφείο:</strong> {user.office_name}</p>}
                  {user.office_phone && <p><strong>Τηλέφωνο:</strong> {user.office_phone}</p>}
                  {user.office_address && <p><strong>Διεύθυνση:</strong> {user.office_address}</p>}
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Τα στοιχεία θα συμπληρωθούν αυτόματα κατά τη δημιουργία του κτιρίου.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">ℹ️ Δεν έχουν οριστεί στοιχεία γραφείου διαχείρισης</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Μπορείτε να ορίσετε τα στοιχεία του γραφείου διαχείρισης στις ρυθμίσεις χρήστη 
                  (εικονίδιο γραναζιού στο header) για αυτόματη συμπλήρωση σε μελλοντικά κτίρια.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="min-w-[150px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Αποθήκευση...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {submitText}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}