'use client';

import { useState } from 'react';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ApartmentList, updateApartmentOwner, updateApartmentTenant, deleteApartment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Settings, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ApartmentStatusModal from './ApartmentStatusModal';
import ApartmentEditModal from './ApartmentEditModal';
import ContactLink from './ContactLink';

interface ApartmentTableEnhancedProps {
  apartments: ApartmentList[];
  onRefresh: () => void;
}

interface EditModalState {
  isOpen: boolean;
  apartment: ApartmentList | null;
  type: 'owner' | 'tenant';
}

export default function ApartmentTableEnhanced({ apartments, onRefresh }: ApartmentTableEnhancedProps) {
  const tableRef = useResizableColumns();
  const [deleting, setDeleting] = useState<number | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentList | null>(null);
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    apartment: null,
    type: 'owner'
  });

  const openEditModal = (apartment: ApartmentList, type: 'owner' | 'tenant') => {
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

  const handleStatusChange = (apartment: ApartmentList) => {
    setSelectedApartment(apartment);
    setStatusModalOpen(true);
  };

  const handleDelete = async (apartmentId: number) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το διαμέρισμα;')) {
      return;
    }

    setDeleting(apartmentId);
    try {
      await deleteApartment(apartmentId);
      toast.success('Το διαμέρισμα διαγράφηκε επιτυχώς');
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Σφάλμα κατά τη διαγραφή');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (apartment: ApartmentList) => {
    if (apartment.is_rented) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Ενοικιασμένο</span>;
    } else if (apartment.is_closed) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Κλειστό</span>;
    } else if (apartment.owner_name) {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Ιδιοκατοίκηση</span>;
    } else {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Κενό</span>;
    }
  };



  const renderOwnershipMills = (apartment: ApartmentList) => {
    const ownershipMills = apartment.ownership_percentage || 0;
    return (
      <div className="text-center">
        <span className="text-sm font-semibold text-blue-600">
          {ownershipMills > 0 ? `${ownershipMills}%` : '-'}
        </span>
      </div>
    );
  };

  const renderHeatingMills = (apartment: ApartmentList) => {
    const heatingMills = apartment.heating_mills || 0;
    return (
      <div className="text-center">
        <span className="text-sm font-semibold text-orange-600">
          {heatingMills > 0 ? `${heatingMills}` : '-'}
        </span>
      </div>
    );
  };

  const renderElevatorMills = (apartment: ApartmentList) => {
    const elevatorMills = apartment.elevator_mills || 0;
    return (
      <div className="text-center">
        <span className="text-sm font-semibold text-purple-600">
          {elevatorMills > 0 ? `${elevatorMills}` : '-'}
        </span>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table ref={tableRef} className="w-full min-w-[1200px] resizable-table">
        <thead className="table-header-gradient-blue sticky top-0 z-10">
          <tr>
            {/* Διαμέρισμα / Διακριτικό */}
            <th className="px-2 py-6 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider min-w-[55px]">
              <div className="flex flex-col items-center space-y-1">
                <span>Διαμέρισμα<br/>/ Διακριτικό</span>
              </div>
            </th>
            
            {/* Όροφος */}
            <th className="px-2 py-6 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider min-w-[55px]">
              <div className="flex flex-col items-center space-y-1">
                <span>Όροφος</span>
              </div>
            </th>
            
            {/* Ιδιοκτήτης & Επικοινωνία */}
            <th className="px-3 py-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
              <div className="flex flex-col items-start space-y-1">
                <span>Ιδιοκτήτης</span>
                <span className="text-[10px] text-gray-400">& Επικοινωνία</span>
              </div>
            </th>
            
            {/* Χιλιοστά Ιδιοκτησίας */}
            <th className="px-2 py-6 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider min-w-[55px]">
              <div className="flex flex-col items-center space-y-1">
                <span className="mt-4">Χιλιοστά<br/>Ιδιοκτησίας</span>
              </div>
            </th>
            
            {/* Χιλιοστά Θέρμανσης */}
            <th className="px-2 py-6 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider min-w-[55px]">
              <div className="flex flex-col items-center space-y-1">
                <span className="mt-4">Χιλιοστά<br/>Θέρμανσης</span>
              </div>
            </th>
            
            {/* Χιλιοστά Ανελκυστήρα */}
            <th className="px-2 py-6 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider min-w-[55px]">
              <div className="flex flex-col items-center space-y-1">
                <span className="mt-4">Χιλιοστά<br/>Ανελκυστήρα</span>
              </div>
            </th>
            
            {/* Ενοικιαστής & Επικοινωνία */}
            <th className="px-3 py-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
              <div className="flex flex-col items-start space-y-1">
                <span>Ενοικιαστής</span>
                <span className="text-[10px] text-gray-400">& Επικοινωνία</span>
              </div>
            </th>
            
            {/* Κατάσταση */}
            <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
              <div className="flex flex-col items-start space-y-1">
                <span>Κατάσταση</span>
              </div>
            </th>
            
            {/* Ενέργειες */}
            <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
              <div className="flex flex-col items-start space-y-1">
                <span>Ενέργειες</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {apartments.map(apartment => (
            <tr key={apartment.id} className="hover:bg-gray-50">
              {/* Διαμέρισμα / Διακριτικό */}
              <td className="px-2 py-4 whitespace-nowrap text-center">
                <div className="text-sm font-medium text-gray-900">
                  {apartment.number}
                </div>
                <div className="text-xs text-blue-600 font-semibold">
                  {apartment.identifier || <span className="text-gray-400 italic">-</span>}
                </div>
              </td>
              
              {/* Όροφος */}
              <td className="px-2 py-4 whitespace-nowrap text-center">
                <div className="text-sm font-medium text-gray-900">
                  {apartment.floor ? `${apartment.floor}ος` : '-'}
                </div>
              </td>
              
              {/* Ιδιοκτήτης & Επικοινωνία */}
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-900">
                      {apartment.owner_name || (
                        <span className="text-gray-400 italic">Μη καταχωρημένο</span>
                      )}
                    </div>
                    {/* Στοιχεία επικοινωνίας ιδιοκτήτη */}
                    <div className="text-xs space-y-1">
                      {apartment.owner_phone && (
                        <div>
                          <span className="text-gray-500">Τηλ. 1:</span>
                          <ContactLink 
                            type="phone" 
                            value={apartment.owner_phone}
                            className="text-xs ml-1"
                          />
                        </div>
                      )}
                      {apartment.owner_phone2 && (
                        <div>
                          <span className="text-gray-500">Τηλ. 2:</span>
                          <ContactLink 
                            type="phone" 
                            value={apartment.owner_phone2}
                            className="text-xs ml-1 font-medium"
                          />
                        </div>
                      )}
                      {apartment.owner_email && (
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <ContactLink 
                            type="email" 
                            value={apartment.owner_email}
                            className="text-xs ml-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal(apartment, 'owner')}
                    className="text-blue-600 hover:text-blue-800 ml-2"
                    title="Επεξεργασία ιδιοκτήτη"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </td>
              
              {/* Χιλιοστά Ιδιοκτησίας */}
              <td className="px-3 py-4 whitespace-nowrap">
                {renderOwnershipMills(apartment)}
              </td>
              
              {/* Χιλιοστά Θέρμανσης */}
              <td className="px-3 py-4 whitespace-nowrap">
                {renderHeatingMills(apartment)}
              </td>
              
              {/* Χιλιοστά Ανελκυστήρα */}
              <td className="px-3 py-4 whitespace-nowrap">
                {renderElevatorMills(apartment)}
              </td>
              
              {/* Ενοικιαστής & Επικοινωνία */}
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-900">
                      {apartment.is_rented ? (
                        apartment.tenant_name || (
                          <span className="text-gray-400 italic">Μη καταχωρημένο</span>
                        )
                      ) : apartment.is_closed ? (
                        <span className="text-orange-600 italic">Κλειστό</span>
                      ) : apartment.owner_name ? (
                        <span className="text-gray-500 italic">Ιδιοκατοίκηση</span>
                      ) : (
                        <span className="text-gray-400 italic">Κενό</span>
                      )}
                    </div>
                    {/* Στοιχεία επικοινωνίας ενοικιαστή */}
                    {apartment.is_rented && (
                      <div className="text-xs space-y-1">
                        {apartment.tenant_phone && (
                          <div>
                            <span className="text-gray-500">Τηλ. 1:</span>
                            <ContactLink 
                              type="phone" 
                              value={apartment.tenant_phone}
                              className="text-xs ml-1"
                            />
                          </div>
                        )}
                        {apartment.tenant_phone2 && (
                          <div>
                            <span className="text-gray-500">Τηλ. 2:</span>
                            <ContactLink 
                              type="phone" 
                              value={apartment.tenant_phone2}
                              className="text-xs ml-1 font-medium"
                            />
                          </div>
                        )}
                        {apartment.tenant_email && (
                          <div>
                            <span className="text-gray-500">Email:</span>
                            <ContactLink 
                              type="email" 
                              value={apartment.tenant_email}
                              className="text-xs ml-1"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openEditModal(apartment, 'tenant')}
                    className="text-green-600 hover:text-green-800 ml-2"
                    title="Επεξεργασία ενοικιαστή"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </td>
               
              {/* Κατάσταση */}
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  {getStatusBadge(apartment)}
                  <button
                    onClick={() => handleStatusChange(apartment)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Αλλαγή κατάστασης"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </td>
              
              {/* Ενέργειες */}
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDelete(apartment.id)}
                    disabled={deleting === apartment.id}
                    className="text-red-600 hover:text-red-900"
                    title="Διαγραφή"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Status Modal */}
      {statusModalOpen && selectedApartment && (
        <ApartmentStatusModal
          apartment={selectedApartment}
          isOpen={statusModalOpen}
          onClose={() => {
            setStatusModalOpen(false);
            setSelectedApartment(null);
          }}
          onUpdate={() => {
            onRefresh();
            setStatusModalOpen(false);
            setSelectedApartment(null);
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
