'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Building, Phone, MapPin, Loader2, Upload, Trash2, Image } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { api, API_BASE_URL } from '@/lib/api';

interface OfficeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OfficeFormData {
  office_name: string;
  office_phone: string;
  office_address: string;
  office_logo?: File;
  office_bank_name: string;
  office_bank_account: string;
  office_bank_iban: string;
  office_bank_beneficiary: string;
}

export default function OfficeSettingsModal({ isOpen, onClose }: OfficeSettingsModalProps) {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<OfficeFormData>({
    office_name: '',
    office_phone: '',
    office_address: '',
    office_bank_name: '',
    office_bank_account: '',
    office_bank_iban: '',
    office_bank_beneficiary: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with user's current office details
  useEffect(() => {
    // TEMPORARILY DISABLED - causing infinite re-rendering
    console.log('[OfficeSettingsModal] useEffect disabled to debug hanging issue');
    return;
    
    if (user) {
      setForm({
        office_name: user.office_name || '',
        office_phone: user.office_phone || '',
        office_address: user.office_address || '',
        office_bank_name: user.office_bank_name || '',
        office_bank_account: user.office_bank_account || '',
        office_bank_iban: user.office_bank_iban || '',
        office_bank_beneficiary: user.office_bank_beneficiary || '',
      });
      const logoUrl = user.office_logo 
        ? (user.office_logo.startsWith('http') ? user.office_logo : `${API_BASE_URL.replace('/api', '')}${user.office_logo.startsWith('/') ? user.office_logo : `/${user.office_logo}`}`)
        : null;
      setCurrentLogoUrl(logoUrl);
      setLogoPreview(null);
      console.log('OfficeSettingsModal: Updated logo URL:', logoUrl);
    }
  }, [user, isOpen]); // Added isOpen as dependency to refresh when modal opens

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Επιτρέπονται μόνο αρχεία τύπου JPEG, PNG ή SVG.');
      return;
    }

    if (file.size > maxSize) {
      toast.error('Το αρχείο πρέπει να είναι μικρότερο από 2MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setForm(prev => ({
      ...prev,
      office_logo: file,
    }));
  };

  const removeLogo = () => {
    setForm(prev => ({
      ...prev,
      office_logo: undefined,
    }));
    setLogoPreview(null);
    setCurrentLogoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('office_name', form.office_name);
      formData.append('office_phone', form.office_phone);
      formData.append('office_address', form.office_address);
      formData.append('office_bank_name', form.office_bank_name);
      formData.append('office_bank_account', form.office_bank_account);
      formData.append('office_bank_iban', form.office_bank_iban);
      formData.append('office_bank_beneficiary', form.office_bank_beneficiary);
      
      if (form.office_logo) {
        formData.append('office_logo', form.office_logo);
      }

      const response = await api.put('/users/office-details/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Τα στοιχεία γραφείου διαχείρισης ενημερώθηκαν επιτυχώς');
      
      // Refresh user data to get updated office details
      await refreshUser();
      
      // Show success message
      toast.success('Τα στοιχεία γραφείου διαχείρισης ενημερώθηκαν επιτυχώς');
      
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Σφάλμα αποθήκευσης';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Ρυθμίσεις Γραφείου Διαχείρισης
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Logo Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Γραφείου Διαχείρισης
              </label>
              
              {/* Current Logo or Preview */}
              {(logoPreview || currentLogoUrl) && (
                <div className="mb-3">
                  <div className="relative inline-block">
                    <img
                      src={logoPreview || currentLogoUrl || ''}
                      alt="Office Logo"
                      className="w-20 h-20 object-contain border border-gray-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* File Input */}
              <div className="flex items-center space-x-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="office_logo"
                />
                <label
                  htmlFor="office_logo"
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {logoPreview || currentLogoUrl ? 'Αλλαγή Logo' : 'Επιλογή Logo'}
                  </span>
                </label>
                {!logoPreview && !currentLogoUrl && (
                  <span className="text-xs text-gray-500">
                    PNG, JPG, SVG (max 2MB)
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="office_name">
                Όνομα Γραφείου Διαχείρισης
              </label>
              <input
                id="office_name"
                name="office_name"
                value={form.office_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. Γραφείο Διαχείρισης Παπαδόπουλος"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="office_phone">
                Τηλέφωνο Γραφείου Διαχείρισης
              </label>
              <input
                id="office_phone"
                name="office_phone"
                value={form.office_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. 210-1234567"
                type="tel"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="office_address">
                Διεύθυνση Γραφείου Διαχείρισης
              </label>
              <input
                id="office_address"
                name="office_address"
                value={form.office_address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. Λεωφ. Συγγρού 123, Αθήνα"
              />
            </div>

            {/* Bank Account Details Section */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Τραπεζικά Στοιχεία</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="office_bank_name">
                    Όνομα Τράπεζας
                  </label>
                  <input
                    id="office_bank_name"
                    name="office_bank_name"
                    value={form.office_bank_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="π.χ. Εθνική Τράπεζα της Ελλάδος"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="office_bank_account">
                    Αριθμός Λογαριασμού
                  </label>
                  <input
                    id="office_bank_account"
                    name="office_bank_account"
                    value={form.office_bank_account}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="π.χ. 1234567890"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="office_bank_iban">
                    IBAN
                  </label>
                  <input
                    id="office_bank_iban"
                    name="office_bank_iban"
                    value={form.office_bank_iban}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="π.χ. GR16 0110 1250 0000 1234 5678 901"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="office_bank_beneficiary">
                    Δικαιούχος
                  </label>
                  <input
                    id="office_bank_beneficiary"
                    name="office_bank_beneficiary"
                    value={form.office_bank_beneficiary}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="π.χ. Γραφείο Διαχείρισης Παπαδόπουλου"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Building className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium">ℹ️ Πληροφορίες</p>
                <p className="text-xs text-blue-700 mt-1">
                  Αυτά τα στοιχεία θα χρησιμοποιηθούν αυτόματα κατά τη δημιουργία νέων κτιρίων, 
                  ώστε να μην χρειάζεται να τα εισάγετε κάθε φορά. Το logo και τα τραπεζικά στοιχεία 
                  θα εμφανίζονται στα ειδοποιητήρια πληρωμής.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Αποθήκευση
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 