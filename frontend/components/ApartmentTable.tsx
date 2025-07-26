'use client';

import { useState } from 'react';
import { ApartmentList, updateApartmentOwner, updateApartmentTenant, deleteApartment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ApartmentStatusModal from './ApartmentStatusModal';
import ApartmentEditModal from './ApartmentEditModal';
import ContactLink from './ContactLink';

interface ApartmentTableProps {
  apartments: ApartmentList[];
  onRefresh: () => void;
}

interface EditModalState {
  isOpen: boolean;
  apartment: ApartmentList | null;
  type: 'owner' | 'tenant';
}

export default function ApartmentTable({ apartments, onRefresh }: ApartmentTableProps) {
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
    } else if (apartment.owner_name) {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Ιδιοκατοίκηση</span>;
    } else {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Κενό</span>;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Διαμέρισμα / Διακριτικό
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ιδιοκτήτης
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Χιλιοστά %
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Κάτοικος
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Επικοινωνία
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Κατάσταση
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ενέργειες
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {apartments.map(apartment => (
            <tr key={apartment.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      <span className="text-xs text-gray-500">Αρ.</span> {apartment.number}
                    </div>
                    <div className="text-sm text-blue-600 font-semibold">
                      <span className="text-xs text-gray-500 font-normal">Διακρ.:</span> {apartment.identifier || <span className="text-gray-400 italic text-xs">-</span>}
                    </div>
                  </div>
                  {apartment.floor && (
                    <div className="text-xs text-gray-500 ml-2">
                      {apartment.floor}ος όροφος
                    </div>
                  )}
                </div>
              </td>
              
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-900">
                    {apartment.owner_name || (
                      <span className="text-gray-400 italic">Μη καταχωρημένο</span>
                    )}
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
              
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {apartment.ownership_percentage ? `${apartment.ownership_percentage}%` : '-'}
              </td>
              
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-900">
                    {apartment.occupant_name || (
                      <span className="text-gray-400 italic">Μη καταχωρημένο</span>
                    )}
                  </div>
                  <button
                    onClick={() => openEditModal(apartment, 'tenant')}
                    className="text-green-600 hover:text-green-800 ml-2"
                    title="Επεξεργασία ενοίκου"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </td>
               
               <td className="px-4 py-4 whitespace-nowrap">
                 <div className="text-sm space-y-1">
                   <div>
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
                   <div>
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
                     <div>
                       <span className="text-xs text-gray-500">Email:</span>
                       <ContactLink 
                         type="email" 
                         value={apartment.occupant_email}
                         className="text-xs ml-1"
                       />
                     </div>
                   )}
                 </div>
               </td>
               
               <td className="px-4 py-4 whitespace-nowrap">
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
              
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
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