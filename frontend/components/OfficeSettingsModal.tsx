'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Building, Phone, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';

interface OfficeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OfficeFormData {
  office_name: string;
  office_phone: string;
  office_address: string;
}

export default function OfficeSettingsModal({ isOpen, onClose }: OfficeSettingsModalProps) {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<OfficeFormData>({
    office_name: '',
    office_phone: '',
    office_address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with user's current office details
  useEffect(() => {
    if (user) {
      setForm({
        office_name: user.office_name || '',
        office_phone: user.office_phone || '',
        office_address: user.office_address || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.put('/users/office-details/', form);
      
      toast.success('Τα στοιχεία γραφείου διαχείρισης ενημερώθηκαν επιτυχώς');
      
      // Refresh user data to get updated office details
      await refreshUser();
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Building className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium">ℹ️ Πληροφορίες</p>
                <p className="text-xs text-blue-700 mt-1">
                  Αυτά τα στοιχεία θα χρησιμοποιηθούν αυτόματα κατά τη δημιουργία νέων κτιρίων, 
                  ώστε να μην χρειάζεται να τα εισάγετε κάθε φορά.
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