'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import { createApartment } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Home, User, UserCheck, Percent, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import ErrorMessage from '@/components/ErrorMessage';

export default function NewApartmentPage() {
  const router = useRouter();
  const { selectedBuilding, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady, user } = useAuth();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    number: '',
    identifier: '',
    floor: '',
    owner_name: '',
    owner_phone: '',
    owner_phone2: '',
    owner_email: '',
    ownership_percentage: '',
    tenant_name: '',
    tenant_phone: '',
    tenant_phone2: '',
    tenant_email: '',
    is_rented: false,
    is_closed: false,
    rent_start_date: '',
    rent_end_date: '',
    square_meters: '',
    bedrooms: '',
    notes: ''
  });

  const canManage = user?.is_superuser || user?.is_staff;

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBuilding) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return;
    }

    if (!formData.number.trim()) {
      toast.error('Ο αριθμός διαμερίσματος είναι υποχρεωτικός');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        building: selectedBuilding.id,
        number: formData.number.trim(),
        identifier: formData.identifier.trim(),
        floor: formData.floor ? Number(formData.floor) : undefined,
        owner_name: formData.owner_name.trim(),
        owner_phone: formData.owner_phone.trim(),
        owner_phone2: formData.owner_phone2.trim(),
        owner_email: formData.owner_email.trim(),
        ownership_percentage: formData.ownership_percentage ? Number(formData.ownership_percentage) : undefined,
        tenant_name: formData.tenant_name.trim(),
        tenant_phone: formData.tenant_phone.trim(),
        tenant_phone2: formData.tenant_phone2.trim(),
        tenant_email: formData.tenant_email.trim(),
        is_rented: formData.is_rented,
        is_closed: formData.is_closed,
        rent_start_date: formData.rent_start_date || undefined,
        rent_end_date: formData.rent_end_date || undefined,
        square_meters: formData.square_meters ? Number(formData.square_meters) : undefined,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
        notes: formData.notes.trim()
      };

      await createApartment(payload);
      toast.success('Το διαμέρισμα δημιουργήθηκε επιτυχώς');
      router.push('/apartments');
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as any)?.data?.detail 
        : 'Σφάλμα κατά τη δημιουργία του διαμερίσματος';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthReady || buildingLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🏠 Νέο Διαμέρισμα</h1>
        <BuildingFilterIndicator className="mb-4" />
        <p>Φόρτωση...</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🏠 Νέο Διαμέρισμα</h1>
        <BuildingFilterIndicator className="mb-4" />
        <ErrorMessage message="Δεν έχετε δικαίωμα δημιουργίας διαμερισμάτων." />
      </div>
    );
  }

  if (!selectedBuilding) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🏠 Νέο Διαμέρισμα</h1>
        <BuildingFilterIndicator className="mb-4" />
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            Επιλέξτε ένα κτίριο για να δημιουργήσετε νέο διαμέρισμα.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/apartments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Επιστροφή
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">🏠 Νέο Διαμέρισμα</h1>
        </div>
      </div>

      <BuildingFilterIndicator className="mb-4" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Βασικά Στοιχεία */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Home className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Βασικά Στοιχεία</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Αριθμός Διαμερίσματος *
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => updateFormData('number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 101, Α1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Διακριτικό Διαμερίσματος
                </label>
                <input
                  type="text"
                  value={formData.identifier}
                  onChange={(e) => updateFormData('identifier', e.target.value)}
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. ΙΣ2, Α1, Β4 (μέχρι 20 χαρακτήρες)"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Όροφος
                </label>
                <input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => updateFormData('floor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Τετραγωνικά
                </label>
                <input
                  type="number"
                  value={formData.square_meters}
                  onChange={(e) => updateFormData('square_meters', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 85"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Υπνοδωμάτια
                </label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => updateFormData('bedrooms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Σημειώσεις
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateFormData('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Επιπλέον πληροφορίες..."
              />
            </div>
          </div>

          {/* Στοιχεία Ιδιοκτησίας */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <User className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Στοιχεία Ιδιοκτησίας</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Όνομα Ιδιοκτήτη
              </label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => updateFormData('owner_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Εισάγετε το όνομα του ιδιοκτήτη"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Τηλέφωνο 1
                </label>
                <input
                  type="tel"
                  value={formData.owner_phone}
                  onChange={(e) => updateFormData('owner_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 210-1234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Τηλέφωνο 2
                </label>
                <input
                  type="tel"
                  value={formData.owner_phone2}
                  onChange={(e) => updateFormData('owner_phone2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 697-1234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Ιδιοκτήτη
              </label>
              <input
                type="email"
                value={formData.owner_email}
                onChange={(e) => updateFormData('owner_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. owner@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Percent className="w-4 h-4 inline mr-1" />
                Χιλιοστά Ιδιοκτησίας (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.ownership_percentage}
                onChange={(e) => updateFormData('ownership_percentage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. 12.5"
              />
            </div>
          </div>
        </div>

        {/* Στοιχεία Ενοικιαστή */}
        <div className="mt-8 pt-8 border-t border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
              <UserCheck className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Στοιχεία Ενοικιαστή</h2>
            </div>

                      <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Κατάσταση Διαμερίσματος
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="status_rented"
                    name="apartment_status"
                    checked={formData.is_rented && !formData.is_closed}
                    onChange={() => {
                      updateFormData('is_rented', true);
                      updateFormData('is_closed', false);
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="status_rented" className="ml-2 text-sm text-gray-700">
                    Ενοικιασμένο
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="status_closed"
                    name="apartment_status"
                    checked={formData.is_closed}
                    onChange={() => {
                      updateFormData('is_rented', false);
                      updateFormData('is_closed', true);
                    }}
                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 focus:ring-orange-500 focus:ring-2"
                  />
                  <label htmlFor="status_closed" className="ml-2 text-sm text-gray-700">
                    Κλειστό (Μη κατοικημένο)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="status_owner_occupied"
                    name="apartment_status"
                    checked={!formData.is_rented && !formData.is_closed}
                    onChange={() => {
                      updateFormData('is_rented', false);
                      updateFormData('is_closed', false);
                    }}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 focus:ring-2"
                  />
                  <label htmlFor="status_owner_occupied" className="ml-2 text-sm text-gray-700">
                    Ιδιοκατοίκηση
                  </label>
                </div>
              </div>
            </div>

                     {(formData.is_rented && !formData.is_closed) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Όνομα Ενοικιαστή
                  </label>
                  <input
                    type="text"
                    value={formData.tenant_name}
                    onChange={(e) => updateFormData('tenant_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Εισάγετε το όνομα του ενοικιαστή"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Τηλέφωνο 1
                    </label>
                    <input
                      type="tel"
                      value={formData.tenant_phone}
                      onChange={(e) => updateFormData('tenant_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="π.χ. 210-1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Τηλέφωνο 2
                    </label>
                    <input
                      type="tel"
                      value={formData.tenant_phone2}
                      onChange={(e) => updateFormData('tenant_phone2', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="π.χ. 697-1234567"
                    />
                  </div>
                </div>

                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Ενοικιαστή
                </label>
                  <input
                    type="email"
                    value={formData.tenant_email}
                    onChange={(e) => updateFormData('tenant_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="π.χ. renter@example.com"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Έναρξη Ενοικίασης
                  </label>
                  <input
                    type="date"
                    value={formData.rent_start_date}
                    onChange={(e) => updateFormData('rent_start_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Λήξη Ενοικίασης
                  </label>
                  <input
                    type="date"
                    value={formData.rent_end_date}
                    onChange={(e) => updateFormData('rent_end_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <Link href="/apartments">
            <Button type="button" variant="outline" disabled={saving}>
              Ακύρωση
            </Button>
          </Link>
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Δημιουργία...' : 'Δημιουργία Διαμερίσματος'}
          </Button>
        </div>
      </form>
    </div>
  );
} 