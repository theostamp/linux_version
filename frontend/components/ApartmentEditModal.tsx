'use client';

import { useState, useEffect } from 'react';
import { ApartmentList, updateApartmentOwner, updateApartmentTenant } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { X, Save, User, UserCheck, Percent, Phone, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ApartmentEditModalProps {
  apartment: ApartmentList;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  editType: 'owner' | 'tenant';
}

export default function ApartmentEditModal({ 
  apartment, 
  isOpen, 
  onClose, 
  onUpdate,
  editType 
}: ApartmentEditModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && apartment) {
      if (editType === 'owner') {
        setFormData({
          identifier: apartment.identifier || '',
          owner_name: apartment.owner_name || '',
          owner_phone: apartment.owner_phone || '',
          owner_phone2: apartment.owner_phone2 || '',
          owner_email: apartment.owner_email || '',
          ownership_percentage: apartment.ownership_percentage || ''
        });
      } else {
        setFormData({
          tenant_name: apartment.tenant_name || '',
          tenant_phone: apartment.tenant_phone || '',
          tenant_phone2: apartment.tenant_phone2 || '',
          tenant_email: apartment.tenant_email || '',
          is_rented: apartment.is_rented || false,
          is_closed: apartment.is_closed || false,
          rent_start_date: '',
          rent_end_date: ''
        });
      }
    }
  }, [isOpen, apartment, editType]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editType === 'owner') {
        const payload = {
          identifier: formData.identifier,
          owner_name: formData.owner_name,
          owner_phone: formData.owner_phone,
          owner_phone2: formData.owner_phone2,
          owner_email: formData.owner_email,
          ownership_percentage: formData.ownership_percentage ? Number(formData.ownership_percentage) : undefined
        };
        
        await updateApartmentOwner(apartment.id, payload);
        toast.success('Τα στοιχεία του ιδιοκτήτη ενημερώθηκαν επιτυχώς');
      } else {
        await updateApartmentTenant(apartment.id, {
          tenant_name: formData.tenant_name,
          tenant_phone: formData.tenant_phone,
          tenant_phone2: formData.tenant_phone2,
          tenant_email: formData.tenant_email,
          is_rented: formData.is_rented,
          is_closed: formData.is_closed,
          rent_start_date: formData.rent_start_date || undefined,
          rent_end_date: formData.rent_end_date || undefined
        });
        toast.success('Τα στοιχεία του ενοικιαστή ενημερώθηκαν επιτυχώς');
      }
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Σφάλμα κατά την ενημέρωση');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isOwner = editType === 'owner';
  const title = isOwner ? 'Επεξεργασία Στοιχείων Ιδιοκτήτη' : 'Επεξεργασία Στοιχείων Ενοικιαστή';
  const icon = isOwner ? <User className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {icon}
            <h2 className="text-xl font-semibold text-gray-900">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Διαμέρισμα {apartment.number}
            </h3>
            <div className="text-sm text-blue-600 font-semibold">
              <span className="text-xs text-gray-500 font-normal">Διακριτικό:</span> {apartment.identifier || <span className="text-gray-400 italic text-xs">Δεν έχει οριστεί</span>}
            </div>
            <p className="text-sm text-gray-600">
              Συμπληρώστε τα στοιχεία {isOwner ? 'του ιδιοκτήτη' : 'του ενοικιαστή'}:
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Διακριτικό Διαμερίσματος - μόνο για ιδιοκτήτη */}
            {isOwner && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Διακριτικό Διαμερίσματος
                </label>
                <input
                  type="text"
                  value={formData.identifier || ''}
                  onChange={(e) => updateFormData('identifier', e.target.value)}
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. Α2, Β1, C3 (μέχρι 20 χαρακτήρες)"
                />
              </div>
            )}

            {/* Name */}
            {(isOwner || (!isOwner && formData.is_rented && !formData.is_closed)) && (
              <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                {isOwner ? 'Όνομα Ιδιοκτήτη' : 'Όνομα Ενοικιαστή'} *
              </label>
                <input
                  type="text"
                  value={formData[isOwner ? 'owner_name' : 'tenant_name'] || ''}
                  onChange={(e) => updateFormData(isOwner ? 'owner_name' : 'tenant_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Εισάγετε το όνομα ${isOwner ? 'του ιδιοκτήτη' : 'του ενοικιαστή'}`}
                />
              </div>
            )}

            {/* Phone 1 */}
            {(isOwner || (!isOwner && formData.is_rented && !formData.is_closed)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Τηλέφωνο 1
                </label>
                <input
                  type="tel"
                  value={formData[isOwner ? 'owner_phone' : 'tenant_phone'] || ''}
                  onChange={(e) => updateFormData(isOwner ? 'owner_phone' : 'tenant_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 210-1234567"
                />
              </div>
            )}

            {/* Phone 2 */}
            {(isOwner || (!isOwner && formData.is_rented && !formData.is_closed)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Τηλέφωνο 2
                </label>
                <input
                  type="tel"
                  value={formData[isOwner ? 'owner_phone2' : 'tenant_phone2'] || ''}
                  onChange={(e) => updateFormData(isOwner ? 'owner_phone2' : 'tenant_phone2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 697-1234567"
                />
              </div>
            )}

            {/* Email */}
            {(isOwner || (!isOwner && formData.is_rented && !formData.is_closed)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData[isOwner ? 'owner_email' : 'tenant_email'] || ''}
                  onChange={(e) => updateFormData(isOwner ? 'owner_email' : 'tenant_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`π.χ. ${isOwner ? 'owner' : 'renter'}@example.com`}
                />
              </div>
            )}

            {/* Owner specific fields */}
            {isOwner && (
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
                  value={formData.ownership_percentage || ''}
                  onChange={(e) => updateFormData('ownership_percentage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. 12.5"
                />
              </div>
            )}

            {/* Tenant specific fields */}
            {!isOwner && (
              <>
                <div className="space-y-3">
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
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Έναρξη Ενοικίασης
                        </label>
                        <input
                          type="date"
                          value={formData.rent_start_date || ''}
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
                          value={formData.rent_end_date || ''}
                          onChange={(e) => updateFormData('rent_end_date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Current Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Τρέχοντα Στοιχεία:</h4>
            <div className="text-sm text-blue-800">
              {isOwner ? (
                <>
                  <div><span className="text-xs text-gray-500">Διακριτικό:</span> <span className="font-medium text-blue-600">{apartment.identifier || 'Δεν έχει οριστεί'}</span></div>
                  <div><span className="text-xs text-gray-500">Ιδιοκτήτης:</span> {apartment.owner_name || 'Δεν έχει οριστεί'}</div>
                  {apartment.ownership_percentage && (
                    <div><span className="text-xs text-gray-500">Χιλιοστά:</span> {apartment.ownership_percentage}%</div>
                  )}
                  <div><span className="text-xs text-gray-500">Τηλ. 1:</span> {apartment.owner_phone || 'Δεν έχει οριστεί'}</div>
                  <div><span className="text-xs text-gray-500">Τηλ. 2:</span> {apartment.owner_phone2 || 'Δεν έχει οριστεί'}</div>
                  {apartment.owner_email && <div><span className="text-xs text-gray-500">Email:</span> {apartment.owner_email}</div>}
                </>
              ) : (
                <>
                  <div><span className="text-xs text-gray-500">Ενοικιαστής:</span> {apartment.tenant_name || 'Δεν έχει οριστεί'}</div>
                  <div><span className="text-xs text-gray-500">Κατάσταση:</span> {apartment.is_rented ? 'Ενοικιασμένο' : apartment.is_closed ? 'Κλειστό' : 'Ιδιοκατοίκηση'}</div>
                  <div><span className="text-xs text-gray-500">Τηλ. 1:</span> {apartment.tenant_phone || 'Δεν έχει οριστεί'}</div>
                  <div><span className="text-xs text-gray-500">Τηλ. 2:</span> {apartment.tenant_phone2 || 'Δεν έχει οριστεί'}</div>
                  {apartment.tenant_email && <div><span className="text-xs text-gray-500">Email:</span> {apartment.tenant_email}</div>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            Ακύρωση
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </div>
      </div>
    </div>
  );
} 