'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AddressAutocomplete from './AddressAutocomplete';
import StreetViewImage from './StreetViewImage';
import type { Building, BuildingPayload } from '@/lib/api';
import { createBuilding, updateBuilding } from '@/lib/api';
import { toast } from 'sonner';

interface CreateBuildingFormProps {
  initialData?: Building;
  onSuccess?: (building: Building) => void;
  onCancel?: () => void;
}

export default function CreateBuildingForm({
  initialData,
  onSuccess,
  onCancel,
}: CreateBuildingFormProps) {
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState<BuildingPayload>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    postal_code: initialData?.postal_code || '',
    country: initialData?.country || 'Ελλάδα',
    latitude: initialData?.latitude || null,
    longitude: initialData?.longitude || null,
    total_apartments: initialData?.total_apartments || undefined,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        city: initialData.city || '',
        postal_code: initialData.postal_code || '',
        country: initialData.country || 'Ελλάδα',
        latitude: initialData.latitude || null,
        longitude: initialData.longitude || null,
        total_apartments: initialData.total_apartments || undefined,
      });
    }
  }, [initialData]);

  const handleInputChange = (
    field: keyof BuildingPayload,
    value: string | number | null | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddressChange = (address: string) => {
    handleInputChange('address', address);
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Το όνομα είναι υποχρεωτικό';
    }

    if (!formData.address?.trim()) {
      newErrors.address = 'Η διεύθυνση είναι υποχρεωτική';
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
      let result: Building;

      if (isEditMode && initialData) {
        result = await updateBuilding(initialData.id, formData);
        toast.success('Το κτίριο ενημερώθηκε επιτυχώς');
      } else {
        result = await createBuilding(formData);
        toast.success('Το κτίριο δημιουργήθηκε επιτυχώς');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Address with Autocomplete */}
          <AddressAutocomplete
            value={formData.address || ''}
            onChange={handleAddressChange}
            onLocationChange={handleLocationChange}
            label="Διεύθυνση"
            placeholder="Εισάγετε διεύθυνση..."
            required
            disabled={loading}
          />
          {errors.address && (
            <p className="text-sm text-red-500">{errors.address}</p>
          )}

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
            <Label htmlFor="total_apartments">Αριθμός Διαμερισμάτων</Label>
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
              disabled={loading}
            />
          </div>

          {/* Coordinates (read-only, set by address autocomplete) */}
          {(formData.latitude || formData.longitude) && (
            <div className="space-y-2">
              <Label>Συντεταγμένες</Label>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Latitude:</span>{' '}
                  {formData.latitude?.toFixed(6)}
                </p>
                <p>
                  <span className="font-medium">Longitude:</span>{' '}
                  {formData.longitude?.toFixed(6)}
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
              latitude={formData.latitude || null}
              longitude={formData.longitude || null}
              width={400}
              height={300}
              className="mt-2"
            />
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
          {loading
            ? 'Αποθήκευση...'
            : isEditMode
              ? 'Ενημέρωση Κτιρίου'
              : 'Δημιουργία Κτιρίου'}
        </Button>
      </div>
    </form>
  );
}

