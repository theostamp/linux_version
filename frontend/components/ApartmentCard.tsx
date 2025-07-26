'use client';

import { useState } from 'react';
import { ApartmentList, deleteApartment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Home, User, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ApartmentStatusModal from './ApartmentStatusModal';
import ApartmentEditModal from './ApartmentEditModal';
import ContactLink from './ContactLink';

interface ApartmentCardProps {
  apartment: ApartmentList;
  onRefresh: () => void;
}

export default function ApartmentCard({ apartment, onRefresh }: ApartmentCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    apartment: ApartmentList | null;
    type: 'owner' | 'tenant';
  }>({
    isOpen: false,
    apartment: null,
    type: 'owner'
  });

  const openEditModal = (type: 'owner' | 'tenant') => {
    setEditModal({
      isOpen: true,
      apartment,
      type
    });
  };

  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      apartment: null,
      type: 'owner'
    });
  };

  const handleDelete = async () => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το διαμέρισμα;')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteApartment(apartment.id);
      toast.success('Το διαμέρισμα διαγράφηκε επιτυχώς');
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Σφάλμα κατά τη διαγραφή');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = () => {
    if (apartment.is_rented) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Ενοικιασμένο</span>;
    } else if (apartment.owner_name) {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Ιδιοκατοίκηση</span>;
    } else {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Κενό</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <Home className="w-5 h-5 text-gray-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              <span className="text-sm text-gray-500 font-normal">Διαμέρισμα</span> {apartment.number}
            </h3>
            <div className="text-sm text-blue-600 font-semibold">
              <span className="text-xs text-gray-500 font-normal">Διακριτικό:</span> {apartment.identifier || <span className="text-gray-400 italic text-xs">-</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          <button
            onClick={() => setStatusModalOpen(true)}
            className="text-blue-600 hover:text-blue-800"
            title="Αλλαγή κατάστασης"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {apartment.floor && (
        <div className="mb-4 text-sm text-gray-600">
          {apartment.floor}ος όροφος
        </div>
      )}

      {/* Ιδιοκτήτης */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Ιδιοκτήτης</span>
          </div>
          <button
            onClick={() => openEditModal('owner')}
            className="text-blue-600 hover:text-blue-800"
            title="Επεξεργασία ιδιοκτήτη"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
        <div>
          <div className="text-sm text-gray-900">
            {apartment.owner_name || (
              <span className="text-gray-400 italic">Μη καταχωρημένο</span>
            )}
          </div>
          {apartment.ownership_percentage && (
            <div className="text-xs text-gray-600 mt-1">
              Χιλιοστά: {apartment.ownership_percentage}%
            </div>
          )}
          <div className="mt-1">
            <span className="text-xs text-gray-500">Τηλ. 1:</span>
            {apartment.owner_phone ? (
              <ContactLink 
                type="phone" 
                value={apartment.owner_phone}
                className="text-xs ml-1"
              />
            ) : (
              <span className="text-gray-400 italic text-xs ml-1">-</span>
            )}
          </div>
          <div className="mt-1">
            <span className="text-xs text-gray-500">Τηλ. 2:</span>
            {apartment.owner_phone2 ? (
              <ContactLink 
                type="phone" 
                value={apartment.owner_phone2}
                className="text-xs ml-1 font-medium"
              />
            ) : (
              <span className="text-gray-400 italic text-xs ml-1">-</span>
            )}
          </div>
          {apartment.owner_email && (
            <div className="mt-1">
              <span className="text-xs text-gray-500">Email:</span>
              <ContactLink 
                type="email" 
                value={apartment.owner_email}
                className="text-xs ml-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Κάτοικος */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Κάτοικος</span>
          </div>
          <button
            onClick={() => openEditModal('tenant')}
            className="text-green-600 hover:text-green-800"
            title="Επεξεργασία ενοίκου"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
        <div>
          <div className="text-sm text-gray-900">
            {apartment.occupant_name || (
              <span className="text-gray-400 italic">Μη καταχωρημένο</span>
            )}
          </div>
          <div className="mt-1">
            <span className="text-xs text-gray-500">Τηλ. 1:</span>
            {apartment.occupant_phone ? (
              <ContactLink 
                type="phone" 
                value={apartment.occupant_phone}
                className="text-xs ml-1"
              />
            ) : (
              <span className="text-gray-400 italic text-xs ml-1">-</span>
            )}
          </div>
          <div className="mt-1">
            <span className="text-xs text-gray-500">Τηλ. 2:</span>
            {apartment.occupant_phone2 ? (
              <ContactLink 
                type="phone" 
                value={apartment.occupant_phone2}
                className="text-xs ml-1 font-medium"
              />
            ) : (
              <span className="text-gray-400 italic text-xs ml-1">-</span>
            )}
          </div>
          {apartment.occupant_email && (
            <div className="mt-1">
              <span className="text-xs text-gray-500">Email:</span>
              <ContactLink 
                type="email" 
                value={apartment.occupant_email}
                className="text-xs ml-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Διαγραφή */}
      <div className="flex justify-end pt-2 border-t border-gray-200">
        <Button
          onClick={handleDelete}
          disabled={deleting}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {deleting ? 'Διαγραφή...' : 'Διαγραφή'}
        </Button>
      </div>

      {/* Status Modal */}
      {statusModalOpen && (
        <ApartmentStatusModal
          apartment={apartment}
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          onUpdate={() => {
            onRefresh();
            setStatusModalOpen(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {editModal.isOpen && editModal.apartment && (
        <ApartmentEditModal
          apartment={editModal.apartment}
          isOpen={editModal.isOpen}
          editType={editModal.type}
          onClose={closeEditModal}
          onUpdate={() => {
            onRefresh();
            closeEditModal();
          }}
        />
      )}
    </div>
  );
} 