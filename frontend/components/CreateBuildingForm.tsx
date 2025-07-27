// frontend/components/CreateBuildingForm.tsx

'use client';

import { useState } from 'react';
import { Building, createBuilding, updateBuilding } from '@/lib/api';
import { useRouter } from 'next/navigation';
import useCsrf from '@/hooks/useCsrf';
import { Button } from '@/components/ui/button';
import { Save, Loader2, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AddressAutocomplete from '@/components/AddressAutocomplete';

interface Props {
  initialData?: Partial<Building>;
  onSuccessPath?: string;
  submitText: string;
  buildingId?: number;
}

export default function CreateBuildingForm({
  initialData = {},
  onSuccessPath = '/buildings',
  submitText,
  buildingId,
}: Readonly<Props>) {
  useCsrf();
  const router = useRouter();
  const [form, setForm] = useState<
    Partial<Building> & {
      apartments_count?: number;
      internal_manager_name?: string;
      internal_manager_phone?: string;
    }
  >(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'apartments_count' ? Number(value) : value,
    }));
  };

  const handleAddressSelect = (addressDetails: {
    fullAddress: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }) => {
    // Έλεγχος αν πρέπει να συμπληρωθεί αυτόματα το όνομα
    const shouldAutoFillName = !form.name || form.name.trim() === '';
    
    setForm((prev) => ({
      ...prev,
      address: addressDetails.fullAddress,
      city: addressDetails.city,
      postal_code: addressDetails.postalCode,
      // Συμπλήρωση ονόματος κτηρίου με τη διεύθυνση (editable από χρήστη)
      name: shouldAutoFillName ? addressDetails.fullAddress : prev.name,
    }));
    
    // Show success feedback
    if (shouldAutoFillName) {
      toast.success(`📍 Διεύθυνση επιλέχθηκε και όνομα κτηρίου συμπληρώθηκε αυτόματα. Μπορείτε να το επεξεργαστείτε!`);
    } else {
      toast.success(`📍 Διεύθυνση επιλέχθηκε: ${addressDetails.fullAddress}${addressDetails.city ? `, ${addressDetails.city}` : ''}${addressDetails.postalCode ? `, ${addressDetails.postalCode}` : ''}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    // Validation for Google Maps mode
    if (useGoogleMaps) {
      if (!form.address || !form.city || !form.postal_code) {
        const missingFields = [];
        if (!form.address) missingFields.push('διεύθυνση');
        if (!form.city) missingFields.push('πόλη');  
        if (!form.postal_code) missingFields.push('ταχυδρομικός κώδικας');
        
        const errorMessage = `Παρακαλώ επιλέξτε μια διεύθυνση από τις προτάσεις του Google Maps. Λείπουν: ${missingFields.join(', ')}`;
        setError(errorMessage);
        toast.error(errorMessage);
        setIsSubmitting(false);
        return;
      }
    }
    
    console.log('📤 Submitting building data:', form); // Debug log
    
    try {
      if (buildingId) {
        await updateBuilding(buildingId, form);
        toast.success('Το κτίριο ενημερώθηκε επιτυχώς');
      } else {
        await createBuilding(form);
        toast.success('Το κτίριο δημιουργήθηκε επιτυχώς');
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
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="apartments_count">
              Αριθμός Διαμερισμάτων
            </label>
            <select
              id="apartments_count"
              name="apartments_count"
              value={form.apartments_count ?? ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                📍 <strong>Οδηγίες:</strong> Αρχίστε να πληκτρολογείτε τη διεύθυνση και <strong>επιλέξτε μια από τις προτάσεις</strong> που εμφανίζονται από το Google Maps.
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

            {/* Manual override fields (readonly when Google Maps is active) */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  placeholder="Θα συμπληρωθεί αυτόματα"
                  readOnly
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  placeholder="Θα συμπληρωθεί αυτόματα"
                  readOnly
                  required
                />
              </div>
            </div>
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
                  placeholder="π.χ. 10552"
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