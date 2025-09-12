// frontend/components/CreateBuildingForm.tsx

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, Building as BuildingIcon, Info, Users, ChevronDown } from 'lucide-react';
import { createBuilding, updateBuilding, fetchBuildingResidents } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import StreetViewImage from '@/components/StreetViewImage';
import { useBuilding } from '@/components/contexts/BuildingContext';
import type { Building } from '@/lib/api';


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
  heating_system?: string;
  heating_fixed_percentage?: number;
  internal_manager_name?: string;
  internal_manager_phone?: string;
  internal_manager_apartment?: string;
  internal_manager_collection_schedule?: string;
  management_office_name?: string;
  management_office_phone?: string;
  management_office_address?: string;
  street_view_image?: string;
  latitude?: number | string;
  longitude?: number | string;
  coordinates?: { lat: number; lng: number };
}

interface BuildingResident {
  id: string;
  apartment_id: number;
  apartment_number: string;
  name: string;
  phone: string;
  email: string;
  type: 'owner' | 'tenant';
  display_text: string;
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
  const [form, setForm] = useState<BuildingFormData>({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    apartments_count: undefined,
    heating_system: 'none',
    heating_fixed_percentage: 30,
    internal_manager_name: '',
    internal_manager_phone: '',
    internal_manager_apartment: '',
    internal_manager_collection_schedule: 'Δευ-Παρ 9:00-17:00',
    management_office_name: user?.office_name || '',
    management_office_phone: user?.office_phone || '',
    management_office_address: user?.office_address || '',
    street_view_image: '',
    ...initialData,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>(
    initialData.coordinates
  );
  
  // State για τη λίστα ενοίκων
  const [residents, setResidents] = useState<BuildingResident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [showResidentsDropdown, setShowResidentsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Φόρτωση ενοίκων του κτιρίου
  useEffect(() => {
    if (buildingId) {
      loadBuildingResidents();
    }
  }, [buildingId]);

  // Κλείσιμο dropdown όταν κάνουμε κλικ έξω
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResidentsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadBuildingResidents = async () => {
    if (!buildingId) return;
    
    try {
      setLoadingResidents(true);
      const data = await fetchBuildingResidents(buildingId);
      setResidents(data.residents);
    } catch (error) {
      console.error('Error loading building residents:', error);
      toast.error('Σφάλμα φόρτωσης ενοίκων');
    } finally {
      setLoadingResidents(false);
    }
  };

  const handleResidentSelect = (resident: BuildingResident) => {
    setForm(prev => ({
      ...prev,
      internal_manager_name: resident.name,
      internal_manager_phone: resident.phone,
      internal_manager_apartment: resident.apartment_number,
    }));
    setShowResidentsDropdown(false);
  };

  const toggleResidentsDropdown = () => {
    if (residents.length > 0) {
      setShowResidentsDropdown(!showResidentsDropdown);
    }
  };

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
    console.log('📍 CreateBuildingForm: handleAddressSelect called with:', addressData);
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
      console.log('📍 CreateBuildingForm: Setting coordinates:', addressData.coordinates);
      setCoordinates(addressData.coordinates);
    } else {
      console.log('📍 CreateBuildingForm: No coordinates in addressData');
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
      // Ensure coordinates are numbers, not strings
      formData.latitude = Number(coordinates.lat);
      formData.longitude = Number(coordinates.lng);
      console.log('📍 CreateBuildingForm: Setting coordinates in formData:', {
        latitude: formData.latitude,
        longitude: formData.longitude,
        latType: typeof formData.latitude,
        lngType: typeof formData.longitude
      });
    } else {
      // Ensure coordinates are not sent if they don't exist
      delete formData.latitude;
      delete formData.longitude;
      console.log('📍 CreateBuildingForm: No coordinates to set');
    }
    
    // Αφαιρούμε το frontend coordinates field
    delete formData.coordinates;
    
    console.log('📍 CreateBuildingForm: Final formData being sent:', formData);
    console.log('📍 CreateBuildingForm: Final coordinates in formData:', {
      latitude: formData.latitude,
      longitude: formData.longitude
    });
    
    try {
      if (buildingId) {
        const updatedBuilding = await updateBuilding(buildingId, formData);
        toast.success('Το κτίριο ενημερώθηκε επιτυχώς');
        // Refresh buildings from server to ensure consistency
        await refreshBuildings();
      } else {
        const newBuilding = await createBuilding(formData);
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

      {/* Heating System Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 flex items-center">
          🔥 Σύστημα Θέρμανσης
        </h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Ρύθμιση Συστήματος Θέρμανσης</p>
              <p className="text-xs text-blue-700 mt-1">
                Επιλέξτε τον τρόπο κατανομής των δαπανών θέρμανσης για το κτίριο. 
                Αυτό θα επηρεάσει τον τρόπο υπολογισμού των κοινοχρήστων.
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="heating_system">
              Τύπος Συστήματος Θέρμανσης
            </label>
            <select
              id="heating_system"
              name="heating_system"
              value={form.heating_system ?? 'none'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="none">Χωρίς Κεντρική Θέρμανση</option>
              <option value="conventional">Συμβατικό (Κατανομή με χιλιοστά)</option>
              <option value="hour_meters">Αυτονομία με Ωρομετρητές</option>
              <option value="heat_meters">Αυτονομία με Θερμιδομετρητές</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Επιλέξτε τον τρόπο κατανομής δαπανών θέρμανσης
            </p>
          </div>
          
          {(form.heating_system === 'hour_meters' || form.heating_system === 'heat_meters') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="heating_fixed_percentage">
                Ποσοστό Παγίου Θέρμανσης (%)
              </label>
              <select
                id="heating_fixed_percentage"
                name="heating_fixed_percentage"
                value={form.heating_fixed_percentage ?? 30}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={20}>20% (Πάγιο) - 80% (Μεταβλητό)</option>
                <option value={25}>25% (Πάγιο) - 75% (Μεταβλητό)</option>
                <option value={30}>30% (Πάγιο) - 70% (Μεταβλητό)</option>
                <option value={35}>35% (Πάγιο) - 65% (Μεταβλητό)</option>
                <option value={40}>40% (Πάγιο) - 60% (Μεταβλητό)</option>
                <option value={50}>50% (Πάγιο) - 50% (Μεταβλητό)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Το πάγιο κατανέμεται ανά χιλιοστά, το μεταβλητό ανά κατανάλωση
              </p>
            </div>
          )}
        </div>
        
        {/* Information boxes for different heating systems */}
        {form.heating_system === 'none' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Χωρίς Κεντρική Θέρμανση:</strong> Οι δαπάνες θέρμανσης δεν θα κατανέμονται στα διαμερίσματα.
            </p>
          </div>
        )}
        
        {form.heating_system === 'conventional' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Συμβατικό Σύστημα:</strong> Όλες οι δαπάνες θέρμανσης (100%) κατανέμονται ανάλογα 
              με τα χιλιοστά συμμετοχής κάθε διαμερίσματος.
            </p>
          </div>
        )}
        
        {form.heating_system === 'hour_meters' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Αυτονομία με Ωρομετρητές:</strong> Το {form.heating_fixed_percentage || 30}% κατανέμεται ως πάγιο 
              (ανά χιλιοστά), το υπόλοιπο {100 - (form.heating_fixed_percentage || 30)}% ως μεταβλητό 
              (ανά ώρες λειτουργίας). Απαιτείται καταχώρηση ενδείξεων ωρομετρητών.
            </p>
          </div>
        )}
        
        {form.heating_system === 'heat_meters' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              <strong>Αυτονομία με Θερμιδομετρητές:</strong> Το {form.heating_fixed_percentage || 30}% κατανέμεται ως πάγιο 
              (ανά χιλιοστά), το υπόλοιπο {100 - (form.heating_fixed_percentage || 30)}% ως μεταβλητό 
              (ανά kWh/MWh κατανάλωσης). Απαιτείται καταχώρηση ενδείξεων θερμιδομετρητών.
            </p>
          </div>
        )}
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
                  {/* <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> */}
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
                  {/* <MapPin className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" /> */}
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

            
            {coordinates ? (
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
                
                {/* Show selected image status */}
                {form.street_view_image && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm text-green-800 font-medium">✅ Εικόνα Street View επιλέχθηκε</p>
                        <p className="text-xs text-green-700 mt-1">
                          URL: {form.street_view_image.substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                

              </div>
            ) : (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Δεν υπάρχουν συντεταγμένες για να εμφανιστεί η εικόνα Street View. 
                  Επιλέξτε μια διεύθυνση από το Google Maps παραπάνω.
                </p>
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
        
        {buildingId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-2">
              <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Επιλογή από ενοίκους του κτιρίου</p>
                <p className="text-xs text-blue-700 mt-1">
                  Μπορείτε να επιλέξετε διαχειριστή από τους υπάρχοντες ενοίκους και ιδιοκτήτες του κτιρίου.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="internal_manager_name">
              Όνομα Διαχειριστή
            </label>
            
            {buildingId && residents.length > 0 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleResidentsDropdown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between"
                >
                  <span className={form.internal_manager_name ? 'text-gray-900' : 'text-gray-500'}>
                    {form.internal_manager_name || 'Επιλέξτε από ενοίκους...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showResidentsDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showResidentsDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {residents.map((resident) => (
                      <button
                        key={resident.id}
                        type="button"
                        onClick={() => handleResidentSelect(resident)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{resident.name}</div>
                        <div className="text-sm text-gray-600">{resident.display_text}</div>
                        <div className="text-xs text-gray-500">{resident.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <input
                id="internal_manager_name"
                name="internal_manager_name"
                value={form.internal_manager_name ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. Γιάννης Παπαδόπουλος"
              />
            )}
            
            {buildingId && loadingResidents && (
              <p className="text-xs text-gray-500 mt-1">Φόρτωση ενοίκων...</p>
            )}
            
            {buildingId && !loadingResidents && residents.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Δεν βρέθηκαν ενοίκους με στοιχεία επικοινωνίας</p>
            )}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="internal_manager_apartment">
              Διαμέρισμα Διαχειριστή
            </label>
            <input
              id="internal_manager_apartment"
              name="internal_manager_apartment"
              value={form.internal_manager_apartment ?? ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="π.χ. Α1, Β2, 1ος όροφος"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="internal_manager_collection_schedule">
              Ώρες και Ημέρες Είσπραξης Κοινοχρήστων
            </label>
            <select
              id="internal_manager_collection_schedule"
              name="internal_manager_collection_schedule"
              value={form.internal_manager_collection_schedule ?? ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Επιλέξτε ώρες είσπραξης...</option>
              <option value="Δευτέρα 17:00-19:00">Δευτέρα 17:00-19:00</option>
              <option value="Τρίτη 17:00-19:00">Τρίτη 17:00-19:00</option>
              <option value="Τετάρτη 17:00-19:00">Τετάρτη 17:00-19:00</option>
              <option value="Πέμπτη 17:00-19:00">Πέμπτη 17:00-19:00</option>
              <option value="Παρασκευή 17:00-19:00">Παρασκευή 17:00-19:00</option>
              <option value="Σάββατο 10:00-12:00">Σάββατο 10:00-12:00</option>
              <option value="Δευτέρα & Τετάρτη 17:00-19:00">Δευτέρα & Τετάρτη 17:00-19:00</option>
              <option value="Τρίτη & Πέμπτη 17:00-19:00">Τρίτη & Πέμπτη 17:00-19:00</option>
              <option value="Δευτέρα & Παρασκευή 17:00-19:00">Δευτέρα & Παρασκευή 17:00-19:00</option>
              <option value="Δευ-Παρ 9:00-17:00">Δευ-Παρ 9:00-17:00</option>
              <option value="Δευ-Παρ 17:00-19:00">Δευ-Παρ 17:00-19:00</option>
              <option value="Σαβ-Κυρ 10:00-12:00">Σαβ-Κυρ 10:00-12:00</option>
              <option value="Κατόπιν συνεννόησης">Κατόπιν συνεννόησης</option>
            </select>
          </div>
        </div>
        
        {buildingId && residents.length > 0 && (
          <div className="text-xs text-gray-600">
            💡 <strong>Σημείωση:</strong> Η επιλογή διαχειριστή από τη λίστα θα συμπληρώσει αυτόματα το όνομα, τηλέφωνο και διαμέρισμα.
          </div>
        )}
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
              {/* <Save className="w-4 h-4 mr-2" /> */}
              {submitText}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}