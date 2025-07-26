'use client';

import { useState } from 'react';
import { ApartmentList, updateApartment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { X, Save, Home, User, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ApartmentStatusModalProps {
  apartment: ApartmentList;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

type StatusType = 'empty' | 'owned' | 'rented';

export default function ApartmentStatusModal({ 
  apartment, 
  isOpen, 
  onClose, 
  onUpdate 
}: ApartmentStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(() => {
    if (apartment.is_rented) return 'rented';
    if (apartment.owner_name) return 'owned';
    return 'empty';
  });
  const [saving, setSaving] = useState(false);

  const statusOptions = [
    {
      value: 'empty' as StatusType,
      label: 'Κενό',
      description: 'Το διαμέρισμα δεν έχει ιδιοκτήτη ή ένοικο',
      icon: <Home className="w-5 h-5" />,
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      selectedColor: 'bg-gray-500 text-white'
    },
    {
      value: 'owned' as StatusType,
      label: 'Ιδιοκατοίκηση',
      description: 'Το διαμέρισμα κατοικείται από τον ιδιοκτήτη',
      icon: <User className="w-5 h-5" />,
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      selectedColor: 'bg-purple-500 text-white'
    },
    {
      value: 'rented' as StatusType,
      label: 'Ενοικιασμένο',
      description: 'Το διαμέρισμα είναι ενοικιασμένο',
      icon: <UserCheck className="w-5 h-5" />,
      color: 'bg-green-100 text-green-800 border-green-300',
      selectedColor: 'bg-green-500 text-white'
    }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload: any = {};

      switch (selectedStatus) {
        case 'empty':
          payload = {
            owner_name: '',
            owner_phone: '',
            owner_phone2: '',
            owner_email: '',
            tenant_name: '',
            tenant_phone: '',
            tenant_phone2: '',
            tenant_email: '',
            is_rented: false,
            rent_start_date: null,
            rent_end_date: null
          };
          break;
        
        case 'owned':
          payload = {
            is_rented: false,
            tenant_name: '',
            tenant_phone: '',
            tenant_phone2: '',
            tenant_email: '',
            rent_start_date: null,
            rent_end_date: null
          };
          // Διατηρούμε τα στοιχεία ιδιοκτήτη αν υπάρχουν
          if (!apartment.owner_name) {
            payload.owner_name = 'Νέος Ιδιοκτήτης';
          }
          break;
        
        case 'rented':
          payload = {
            is_rented: true
          };
          // Διατηρούμε τα υπάρχοντα στοιχεία
          if (!apartment.tenant_name) {
            payload.tenant_name = 'Νέος Ένοικος';
          }
          if (!apartment.owner_name) {
            payload.owner_name = 'Ιδιοκτήτης';
          }
          break;
      }

      await updateApartment(apartment.id, payload);
      toast.success('Το status του διαμερίσματος ενημερώθηκε επιτυχώς');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Σφάλμα κατά την ενημέρωση του status');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Αλλαγή Status Διαμερίσματος
          </h2>
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
            <p className="text-sm text-gray-600">
              Επιλέξτε τη νέα κατάσταση του διαμερίσματος:
            </p>
          </div>

          {/* Status Options */}
          <div className="space-y-3">
            {statusOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  selectedStatus === option.value
                    ? `${option.selectedColor} border-current`
                    : `${option.color} hover:border-gray-400`
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium">
                        {option.label}
                      </h4>
                      {selectedStatus === option.value && (
                        <div className="ml-2 w-2 h-2 bg-current rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Current Status Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Τρέχον Status:</h4>
            <div className="text-sm text-blue-800">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{apartment.status_display}</span>
              </div>
              {apartment.occupant_name && (
                <div className="mt-1">
                  Κάτοικος: {apartment.occupant_name}
                </div>
              )}
              {apartment.occupant_phone && (
                <div className="mt-1">
                  Τηλέφωνο: {apartment.occupant_phone}
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          {selectedStatus === 'empty' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <div className="text-yellow-600 text-sm">
                  ⚠️ <strong>Προσοχή:</strong> Η επιλογή "Κενό" θα διαγράψει όλα τα στοιχεία 
                  ιδιοκτήτη και ενοίκου. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                </div>
              </div>
            </div>
          )}
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