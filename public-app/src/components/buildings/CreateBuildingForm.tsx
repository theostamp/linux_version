'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AddressAutocomplete from './AddressAutocomplete';
import StreetViewImage from './StreetViewImage';
import type { Building, BuildingPayload, BuildingResident } from '@/lib/api';
import { createBuilding, updateBuilding, fetchBuildingResidents, fetchApartments } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Building as BuildingIcon, Users, Info, ChevronDown, Loader2 } from 'lucide-react';

interface CreateBuildingFormProps {
  initialData?: Building;
  onSuccess?: (building: Building) => void;
  onCancel?: () => void;
  buildingId?: number;
  submitText?: string;
}

interface ApartmentOption {
  id: number;
  number: string;
}

const normalizeCoordinate = (
  value: number | string | null | undefined
): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCoordinate = (
  value: number | string | null | undefined
): string | null => {
  const normalized = normalizeCoordinate(value);
  if (normalized === null || normalized === undefined) {
    return null;
  }
  // Ensure it's a number before calling toFixed
  if (typeof normalized !== 'number' || !Number.isFinite(normalized)) {
    return null;
  }
  return normalized.toFixed(6);
};

export default function CreateBuildingForm({
  initialData,
  onSuccess,
  onCancel,
  buildingId,
  submitText,
}: CreateBuildingFormProps) {
  const { user } = useAuth();
  const { refreshBuildings } = useBuilding();
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState<BuildingPayload>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    postal_code: initialData?.postal_code || '',
    country: initialData?.country || 'Ελλάδα',
    latitude: normalizeCoordinate(initialData?.latitude),
    longitude: normalizeCoordinate(initialData?.longitude),
    total_apartments: initialData?.total_apartments || initialData?.apartments_count || undefined,
    heating_system: initialData?.heating_system || 'none',
    heating_fixed_percentage: initialData?.heating_fixed_percentage || 30,
    internal_manager_name: initialData?.internal_manager_name || '',
    internal_manager_phone: initialData?.internal_manager_phone || '',
    internal_manager_apartment: initialData?.internal_manager_apartment || '',
    internal_manager_collection_schedule: initialData?.internal_manager_collection_schedule || 'Δευ-Παρ 9:00-17:00',
    management_office_name: initialData?.management_office_name || user?.office_name || '',
    management_office_phone: initialData?.management_office_phone || user?.office_phone || '',
    management_office_address: initialData?.management_office_address || user?.office_address || '',
    street_view_image: initialData?.street_view_image || '',
    financial_system_start_date: initialData?.financial_system_start_date || null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>(
    initialData?.latitude && initialData?.longitude
      ? { lat: initialData.latitude, lng: initialData.longitude }
      : undefined
  );

  // State για τη λίστα ενοίκων
  const [residents, setResidents] = useState<BuildingResident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [showResidentsDropdown, setShowResidentsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State για τη λίστα διαμερισμάτων
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [loadingApartments, setLoadingApartments] = useState(false);
  const [showApartmentsDropdown, setShowApartmentsDropdown] = useState(false);
  const apartmentDropdownRef = useRef<HTMLDivElement>(null);

  // Φόρτωση ενοίκων και διαμερισμάτων του κτιρίου
  useEffect(() => {
    if (buildingId) {
      loadBuildingResidents();
      loadBuildingApartments();
    }
  }, [buildingId]);

  // Κλείσιμο dropdown όταν κάνουμε κλικ έξω
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResidentsDropdown(false);
      }
      if (apartmentDropdownRef.current && !apartmentDropdownRef.current.contains(event.target as Node)) {
        setShowApartmentsDropdown(false);
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

  const loadBuildingApartments = async () => {
    if (!buildingId) return;

    try {
      setLoadingApartments(true);
      const data = await fetchApartments(buildingId);
      setApartments(data.map(apt => ({ id: apt.id, number: apt.number })));
    } catch (error) {
      console.error('Error loading building apartments:', error);
      toast.error('Σφάλμα φόρτωσης διαμερισμάτων');
    } finally {
      setLoadingApartments(false);
    }
  };

  const handleResidentSelect = (resident: BuildingResident) => {
    setFormData(prev => ({
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

  const handleApartmentSelect = (apartment: ApartmentOption) => {
    setFormData(prev => ({
      ...prev,
      internal_manager_apartment: apartment.number,
    }));
    setShowApartmentsDropdown(false);
  };

  const toggleApartmentsDropdown = () => {
    if (apartments.length > 0) {
      setShowApartmentsDropdown(!showApartmentsDropdown);
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        city: initialData.city || '',
        postal_code: initialData.postal_code || '',
        country: initialData.country || 'Ελλάδα',
        latitude: normalizeCoordinate(initialData.latitude),
        longitude: normalizeCoordinate(initialData.longitude),
        total_apartments: initialData.total_apartments || initialData.apartments_count || undefined,
        heating_system: initialData.heating_system || 'none',
        heating_fixed_percentage: initialData.heating_fixed_percentage || 30,
        internal_manager_name: initialData.internal_manager_name || '',
        internal_manager_phone: initialData.internal_manager_phone || '',
        internal_manager_apartment: initialData.internal_manager_apartment || '',
        internal_manager_collection_schedule: initialData.internal_manager_collection_schedule || 'Δευ-Παρ 9:00-17:00',
        management_office_name: initialData.management_office_name || user?.office_name || '',
        management_office_phone: initialData.management_office_phone || user?.office_phone || '',
        management_office_address: initialData.management_office_address || user?.office_address || '',
        street_view_image: initialData.street_view_image || '',
        financial_system_start_date: initialData.financial_system_start_date || null,
      });
      if (initialData.latitude && initialData.longitude) {
        setCoordinates({ lat: initialData.latitude, lng: initialData.longitude });
      }
    }
  }, [initialData, user]);

  const handleInputChange = useCallback((
    field: keyof BuildingPayload,
    value: string | number | null | undefined
  ) => {
    // Special handling for postal_code field
    let processedValue = value;
    if (field === 'postal_code' && typeof value === 'string') {
      // Remove spaces and non-numeric characters
      processedValue = value.replace(/\s/g, '').replace(/[^0-9]/g, '');
      // Limit to 5 digits
      processedValue = processedValue.slice(0, 5);
    }

    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    // Clear error for this field
    setErrors((prev) => {
      if (prev[field]) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const handleAddressChange = useCallback((address: string) => {
    handleInputChange('address', address);
  }, [handleInputChange]);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Το όνομα είναι υποχρεωτικό';
    }

    if (useGoogleMaps) {
      if (!formData.address?.trim()) {
        newErrors.address = 'Η διεύθυνση είναι υποχρεωτική';
      }
      if (!formData.city?.trim()) {
        newErrors.city = 'Η πόλη είναι υποχρεωτική';
      }
      if (!formData.postal_code?.trim()) {
        newErrors.postal_code = 'Ο ταχυδρομικός κώδικας είναι υποχρεωτικός';
      }
    } else {
      if (!formData.address?.trim()) {
        newErrors.address = 'Η διεύθυνση είναι υποχρεωτική';
      }
    }

    if (!formData.total_apartments && !formData.apartments_count) {
      newErrors.total_apartments = 'Ο αριθμός διαμερισμάτων είναι υποχρεωτικός';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
      return;
    }

    setLoading(true);

    try {
      // Προετοιμασία δεδομένων για αποστολή
      const payload: BuildingPayload = { ...formData };

      // Προσθήκη συντεταγμένων αν υπάρχουν - ensure they are numbers
      if (coordinates && coordinates.lat && coordinates.lng) {
        const lat = typeof coordinates.lat === 'number' 
          ? coordinates.lat 
          : parseFloat(String(coordinates.lat));
        const lng = typeof coordinates.lng === 'number' 
          ? coordinates.lng 
          : parseFloat(String(coordinates.lng));
        
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          payload.latitude = lat;
          payload.longitude = lng;
        }
      } else if (formData.latitude !== undefined || formData.longitude !== undefined) {
        // Fallback: use formData coordinates if coordinates state is not set
        const lat = typeof formData.latitude === 'number' 
          ? formData.latitude 
          : typeof formData.latitude === 'string'
          ? parseFloat(formData.latitude)
          : null;
        const lng = typeof formData.longitude === 'number' 
          ? formData.longitude 
          : typeof formData.longitude === 'string'
          ? parseFloat(formData.longitude)
          : null;
        
        if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
          payload.latitude = lat;
          payload.longitude = lng;
        } else {
          // Remove invalid coordinates
          delete payload.latitude;
          delete payload.longitude;
        }
      }

      // Ensure apartments_count is set
      if (payload.total_apartments && !payload.apartments_count) {
        payload.apartments_count = payload.total_apartments;
      }

      let result: Building;

      if (isEditMode && initialData) {
        result = await updateBuilding(initialData.id, payload);
        toast.success('Το κτίριο ενημερώθηκε επιτυχώς');
        await refreshBuildings();
      } else {
        result = await createBuilding(payload);
        toast.success('Το κτίριο δημιουργήθηκε επιτυχώς');
        await refreshBuildings();
      }

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMessage =
        err?.message || `Σφάλμα κατά την ${isEditMode ? 'ενημέρωση' : 'δημιουργία'} του κτιρίου`;
      toast.error(errorMessage);
      console.error('Building form error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Safely format coordinates - ensure they are numbers
  const latitudeFormatted = formatCoordinate(
    typeof formData.latitude === 'string' ? parseFloat(formData.latitude) : formData.latitude
  );
  const longitudeFormatted = formatCoordinate(
    typeof formData.longitude === 'string' ? parseFloat(formData.longitude) : formData.longitude
  );
  const hasCoordinates = latitudeFormatted !== null || longitudeFormatted !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Βασικές Πληροφορίες
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-4">
            {/* Building Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Όνομα Κτιρίου <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="π.χ. Αλκμάνος 22"
                required
                disabled={loading}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Google Maps Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useGoogleMaps"
                checked={useGoogleMaps}
                onChange={(e) => setUseGoogleMaps(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="useGoogleMaps" className="cursor-pointer">
                Χρήση Google Maps για αυτόματη συμπλήρωση διεύθυνσης
              </Label>
            </div>

            {/* Address with Autocomplete */}
            {useGoogleMaps ? (
              <AddressAutocomplete
                value={formData.address || ''}
                onChange={handleAddressChange}
                onLocationChange={handleLocationChange}
                onAddressDetailsChange={(details) => {
                  // Auto-populate city and postal_code from Google Places
                  if (details.city) {
                    handleInputChange('city', details.city);
                  }
                  if (details.postal_code) {
                    handleInputChange('postal_code', details.postal_code);
                  }
                  if (details.country) {
                    handleInputChange('country', details.country);
                  }
                  // Auto-populate building name from address if not already set
                  if (details.address && !formData.name) {
                    const buildingName = details.address.split(',')[0].trim();
                    if (buildingName) {
                      handleInputChange('name', buildingName);
                    }
                  }
                }}
                label="Διεύθυνση"
                placeholder="Εισάγετε διεύθυνση..."
                required
                disabled={loading}
              />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="address">
                    Διεύθυνση <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="π.χ. Οδός Αθηνάς 25"
                    required
                    disabled={loading}
                    className={errors.address ? 'border-red-500' : ''}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-500">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      Πόλη <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="π.χ. Αθήνα"
                      required
                      disabled={loading}
                      className={errors.city ? 'border-red-500' : ''}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-500">{errors.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">
                      Ταχυδρομικός Κώδικας <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="postal_code"
                      type="text"
                      value={formData.postal_code || ''}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      placeholder="π.χ. 11528 (5 ψηφία)"
                      maxLength={5}
                      pattern="[0-9]{5}"
                      required
                      disabled={loading}
                      className={errors.postal_code ? 'border-red-500' : ''}
                    />
                    {errors.postal_code && (
                      <p className="text-sm text-red-500">{errors.postal_code}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {useGoogleMaps && (
              <>
                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">Πόλη</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="π.χ. Αθήνα"
                    disabled={loading}
                  />
                </div>

                {/* Postal Code */}
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Ταχυδρομικός Κώδικας</Label>
                  <Input
                    id="postal_code"
                    type="text"
                    value={formData.postal_code || ''}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    placeholder="π.χ. 11528"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Χώρα</Label>
              <Input
                id="country"
                type="text"
                value={formData.country || 'Ελλάδα'}
                onChange={(e) => handleInputChange('country', e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Total Apartments */}
            <div className="space-y-2">
              <Label htmlFor="total_apartments">
                Αριθμός Διαμερισμάτων <span className="text-red-500">*</span>
              </Label>
              <Input
                id="total_apartments"
                type="number"
                min="0"
                value={formData.total_apartments || ''}
                onChange={(e) =>
                  handleInputChange(
                    'total_apartments',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                placeholder="π.χ. 10"
                required
                disabled={loading}
                className={errors.total_apartments ? 'border-red-500' : ''}
              />
              {errors.total_apartments && (
                <p className="text-sm text-red-500">{errors.total_apartments}</p>
              )}
            </div>

            {/* Coordinates (read-only, set by address autocomplete) */}
            {hasCoordinates && (
              <div className="space-y-2">
                <Label>Συντεταγμένες</Label>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Latitude:</span>{' '}
                    {latitudeFormatted ?? '—'}
                  </p>
                  <p>
                    <span className="font-medium">Longitude:</span>{' '}
                    {longitudeFormatted ?? '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Street View Preview */}
          <div className="space-y-4">
            <div>
              <Label>Προεπισκόπηση</Label>
              <StreetViewImage
                address={formData.address || ''}
                latitude={
                  typeof formData.latitude === 'number' && Number.isFinite(formData.latitude)
                    ? formData.latitude
                    : typeof formData.latitude === 'string'
                    ? parseFloat(formData.latitude) || null
                    : null
                }
                longitude={
                  typeof formData.longitude === 'number' && Number.isFinite(formData.longitude)
                    ? formData.longitude
                    : typeof formData.longitude === 'string'
                    ? parseFloat(formData.longitude) || null
                    : null
                }
                width={400}
                height={300}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Heating System */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Σύστημα Θέρμανσης
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="heating_system">Τύπος Συστήματος Θέρμανσης</Label>
            <select
              id="heating_system"
              name="heating_system"
              value={formData.heating_system || 'none'}
              onChange={(e) => handleInputChange('heating_system', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              disabled={loading}
            >
              <option value="none">Κανένα</option>
              <option value="central">Κεντρική Θέρμανση</option>
              <option value="autonomous">Αυτόνομη Θέρμανση</option>
              <option value="mixed">Μικτή</option>
            </select>
          </div>

          {formData.heating_system === 'central' && (
            <div className="space-y-2">
              <Label htmlFor="heating_fixed_percentage">
                Ποσοστό Καθόλου (0-100%)
              </Label>
              <Input
                id="heating_fixed_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.heating_fixed_percentage || 30}
                onChange={(e) =>
                  handleInputChange(
                    'heating_fixed_percentage',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                disabled={loading}
              />
            </div>
          )}
        </div>
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
            <Label htmlFor="internal_manager_name">Όνομα Διαχειριστή</Label>

            {buildingId && residents.length > 0 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleResidentsDropdown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between"
                >
                  <span className={formData.internal_manager_name ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.internal_manager_name || 'Επιλέξτε από ενοίκους...'}
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
              <Input
                id="internal_manager_name"
                type="text"
                value={formData.internal_manager_name || ''}
                onChange={(e) => handleInputChange('internal_manager_name', e.target.value)}
                placeholder="π.χ. Γιάννης Παπαδόπουλος"
                disabled={loading}
              />
            )}

            {buildingId && loadingResidents && (
              <p className="text-xs text-gray-500 mt-1">Φόρτωση ενοίκων...</p>
            )}

            {buildingId && !loadingResidents && residents.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Δεν βρέθηκαν ενοίκους με στοιχεία επικοινωνίας</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="internal_manager_phone">Τηλέφωνο Διαχειριστή</Label>
            <Input
              id="internal_manager_phone"
              type="tel"
              value={formData.internal_manager_phone || ''}
              onChange={(e) => handleInputChange('internal_manager_phone', e.target.value)}
              placeholder="π.χ. 210-1234567"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative" ref={apartmentDropdownRef}>
            <Label htmlFor="internal_manager_apartment">Διαμέρισμα Διαχειριστή</Label>

            {buildingId && apartments.length > 0 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleApartmentsDropdown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between"
                >
                  <span className={formData.internal_manager_apartment ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.internal_manager_apartment || 'Επιλέξτε διαμέρισμα...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showApartmentsDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showApartmentsDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {apartments.map((apartment) => (
                      <button
                        key={apartment.id}
                        type="button"
                        onClick={() => handleApartmentSelect(apartment)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{apartment.number}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Input
                id="internal_manager_apartment"
                type="text"
                value={formData.internal_manager_apartment || ''}
                onChange={(e) => handleInputChange('internal_manager_apartment', e.target.value)}
                placeholder="π.χ. Α1, Β2, 1ος όροφος"
                disabled={loading}
              />
            )}

            {buildingId && loadingApartments && (
              <p className="text-xs text-gray-500 mt-1">Φόρτωση διαμερισμάτων...</p>
            )}

            {buildingId && !loadingApartments && apartments.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Δεν βρέθηκαν διαμερίσματα</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="internal_manager_collection_schedule">
              Ώρες και Ημέρες Είσπραξης Κοινοχρήστων
            </Label>
            <select
              id="internal_manager_collection_schedule"
              name="internal_manager_collection_schedule"
              value={formData.internal_manager_collection_schedule || ''}
              onChange={(e) => handleInputChange('internal_manager_collection_schedule', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              disabled={loading}
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

      {/* Financial System Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Οικονομικές Ρυθμίσεις
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="financial_system_start_date">
              Ημερομηνία Έναρξης Οικονομικού Συστήματος
            </Label>
            <Input
              id="financial_system_start_date"
              type="date"
              value={
                formData.financial_system_start_date
                  ? new Date(formData.financial_system_start_date).toISOString().split('T')[0]
                  : ''
              }
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  // Ensure it's the 1st of the month
                  const date = new Date(dateValue);
                  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                  const formattedDate = firstOfMonth.toISOString().split('T')[0];
                  handleInputChange('financial_system_start_date', formattedDate);
                } else {
                  handleInputChange('financial_system_start_date', null);
                }
              }}
              disabled={loading}
              className="max-w-xs"
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">ℹ️ Σημείωση:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      Αν αφήσετε το πεδίο κενό, θα υπολογιστεί αυτόματα η <strong>1η του μήνα</strong> που δημιουργήθηκε το κτίριο.
                    </li>
                    <li>
                      Αν εισαγάγετε ημερομηνία, θα χρησιμοποιηθεί η <strong>1η του μήνα</strong> της εισαγμένης ημερομηνίας.
                    </li>
                    <li>
                      Αυτή η ημερομηνία καθορίζει πότε αρχίζουν να υπολογίζονται τα management fees και άλλες οικονομικές υποχρεώσεις.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Ακύρωση
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Αποθήκευση...
            </>
          ) : (
            submitText || (isEditMode ? 'Ενημέρωση Κτιρίου' : 'Δημιουργία Κτιρίου')
          )}
        </Button>
      </div>
    </form>
  );
}
