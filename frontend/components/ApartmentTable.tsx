'use client';

import { useState, useEffect } from 'react';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ApartmentList, updateApartmentOwner, updateApartmentTenant, deleteApartment, invitationApi, type Invitation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Settings, Mail, MailCheck, UserPlus, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ApartmentStatusModal from './ApartmentStatusModal';
import ApartmentEditModal from './ApartmentEditModal';
import ContactLink from './ContactLink';
import { typography } from '@/lib/typography';

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
  const tableRef = useResizableColumns();
  const [deleting, setDeleting] = useState<number | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentList | null>(null);
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    apartment: null,
    type: 'owner'
  });
  
  // Invitation states
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [sendingInvitation, setSendingInvitation] = useState<{ email: string; apartmentId: number } | null>(null);
  
  // Load invitations on mount
  useEffect(() => {
    loadInvitations();
  }, []);
  
  const loadInvitations = async () => {
    try {
      const data = await invitationApi.list();
      setInvitations(data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };
  
  const hasPendingInvitation = (email: string): boolean => {
    if (!email) return false;
    return invitations.some(
      inv => inv.email.toLowerCase() === email.toLowerCase() && 
      inv.status === 'pending' && 
      !inv.is_expired
    );
  };
  
  const handleSendInvitation = async (email: string, apartmentId: number, type: 'owner' | 'tenant') => {
    if (!email) {
      toast.error('Το email είναι υποχρεωτικό');
      return;
    }
    
    setSendingInvitation({ email, apartmentId });
    
    try {
      await invitationApi.create({
        email,
        invited_role: 'resident',
        apartment_id: apartmentId,
        message: `Σας προσκληθήκατε να συμμετάσχετε στην πλατφόρμα διαχείρισης του κτιρίου ως ${type === 'owner' ? 'ιδιοκτήτης' : 'ενοικιαστής'} του διαμερίσματος.`,
        expires_in_days: 7,
      });
      
      toast.success(`Η πρόσκληση στάλθηκε επιτυχώς στο ${email}`);
      loadInvitations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Αποτυχία αποστολής πρόσκλησης';
      toast.error(errorMessage);
    } finally {
      setSendingInvitation(null);
    }
  };

  // Υπολογισμός αθροισμάτων χιλιοστών
  const totals = {
    ownership: apartments.reduce((sum, apt) => sum + (apt.participation_mills || 0), 0),
    heating: apartments.reduce((sum, apt) => sum + (apt.heating_mills || 0), 0),
    elevator: apartments.reduce((sum, apt) => sum + (apt.elevator_mills || 0), 0)
  };

  // Έλεγχος αν τα αθροίσματα είναι 1000
  const isOwnershipCorrect = totals.ownership === 1000;
  const isHeatingCorrect = totals.heating === 1000;
  const isElevatorCorrect = totals.elevator === 1000;

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
    const ownershipMills = apartment.participation_mills;
    return (
      <div className="text-center">
        <span className="text-sm font-semibold text-blue-600">
          {ownershipMills && ownershipMills > 0 ? `${ownershipMills}` : '-'}
        </span>
      </div>
    );
  };

  const renderHeatingMills = (apartment: ApartmentList) => {
    const heatingMills = apartment.heating_mills;
    return (
      <div className="text-center">
        <span className="text-sm font-semibold text-orange-600">
          {heatingMills && heatingMills > 0 ? `${heatingMills}` : '-'}
        </span>
      </div>
    );
  };

  const renderElevatorMills = (apartment: ApartmentList) => {
    const elevatorMills = apartment.elevator_mills;
    return (
      <div className="text-center">
        <span className="text-sm font-semibold text-purple-600">
          {elevatorMills && elevatorMills > 0 ? `${elevatorMills}` : '-'}
        </span>
      </div>
    );
  };

  // Keep totals calculations for the summary row at the bottom of the table

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
      <table ref={tableRef} className="w-full min-w-[900px] resizable-table">
        <thead className="table-header-gradient-blue sticky top-0 z-10">
          <tr>
            <th className={`px-2 py-6 text-center ${typography.tableHeader} w-[55px] min-w-[55px] max-w-[55px]`}>
              <div className="flex flex-col items-center space-y-1">
                <div className="writing-mode-vertical transform -rotate-90 origin-center mt-4">
                  <span>Διαμέρισμα</span>
                </div>
              </div>
            </th>
            <th className={`px-4 py-6 pr-6 text-left ${typography.tableHeader}`}>
              Ιδιοκτήτης & Επικοινωνία
            </th>
            <th className={`px-2 py-6 text-center ${typography.tableHeader} w-[55px] min-w-[55px] max-w-[55px]`}>
              <div className="flex flex-col items-center space-y-1">
                <div className="writing-mode-vertical transform -rotate-90 origin-center mt-4">
                  <span>Χιλιοστά<br/>Ιδιοκτησίας</span>
                </div>
              </div>
            </th>
            <th className={`px-2 py-6 text-center ${typography.tableHeader} w-[55px] min-w-[55px] max-w-[55px]`}>
              <div className="flex flex-col items-center space-y-1">
                <div className="writing-mode-vertical transform -rotate-90 origin-center mt-4">
                  <span>Χιλιοστά<br/>Θέρμανσης</span>
                </div>
              </div>
            </th>
            <th className={`px-2 py-6 text-center ${typography.tableHeader} w-[55px] min-w-[55px] max-w-[55px]`}>
              <div className="flex flex-col items-center space-y-1">
                <div className="writing-mode-vertical transform -rotate-90 origin-center mt-4">
                  <span>Χιλιοστά<br/>Ανελκυστήρα</span>
                </div>
              </div>
            </th>
            <th className={`px-4 py-6 pr-6 text-left ${typography.tableHeader}`}>
              Ενοικιαστής & Επικοινωνία
            </th>
            <th className={`px-4 py-3 text-left ${typography.tableHeader}`}>
              Κατάσταση
            </th>
            <th className={`px-4 py-3 text-left ${typography.tableHeader}`}>
              Ενέργειες
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {apartments.map((apartment, index) => (
            <tr key={apartment.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/100'}`}>
              <td className="px-2 py-4 whitespace-nowrap text-center w-[55px]">
                <div className="text-sm font-medium text-gray-900">
                  {apartment.identifier || apartment.number}
                </div>
              </td>
              
              <td className="px-4 py-4 pr-6 whitespace-nowrap">
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
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => openEditModal(apartment, 'owner')}
                      className="text-blue-600 hover:text-blue-800"
                      title="Επεξεργασία ιδιοκτήτη"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </td>
              
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 w-[55px]">
                {renderOwnershipMills(apartment)}
              </td>
              
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 w-[55px]">
                {renderHeatingMills(apartment)}
              </td>
              
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 w-[55px]">
                {renderElevatorMills(apartment)}
              </td>
              
              <td className="px-4 py-4 pr-6 whitespace-nowrap">
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
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => openEditModal(apartment, 'tenant')}
                      className="text-green-600 hover:text-green-800"
                      title="Επεξεργασία ενοικιαστή"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
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
                <div className="flex items-center space-x-2">
                  {/* Invitation buttons for owner and tenant */}
                  {((apartment.owner_email && !hasPendingInvitation(apartment.owner_email)) || 
                    (apartment.tenant_email && !hasPendingInvitation(apartment.tenant_email))) && (
                    <button
                      onClick={() => {
                        // Prioritize tenant email if both exist
                        const email = apartment.tenant_email || apartment.owner_email;
                        const type = apartment.tenant_email ? 'tenant' : 'owner';
                        if (email) {
                          handleSendInvitation(email, apartment.id, type);
                        }
                      }}
                      disabled={
                        (apartment.owner_email && sendingInvitation?.email === apartment.owner_email && sendingInvitation?.apartmentId === apartment.id) ||
                        (apartment.tenant_email && sendingInvitation?.email === apartment.tenant_email && sendingInvitation?.apartmentId === apartment.id)
                      }
                      className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        (apartment.owner_email && hasPendingInvitation(apartment.owner_email)) || 
                        (apartment.tenant_email && hasPendingInvitation(apartment.tenant_email))
                          ? "Υπάρχει ενεργή πρόσκληση"
                          : "Στείλε πρόσκληση για πρόσβαση στην εφαρμογή"
                      }
                    >
                      {(apartment.owner_email && sendingInvitation?.email === apartment.owner_email && sendingInvitation?.apartmentId === apartment.id) ||
                       (apartment.tenant_email && sendingInvitation?.email === apartment.tenant_email && sendingInvitation?.apartmentId === apartment.id) ? (
                        <MailCheck className="w-4 h-4 animate-pulse" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {(apartment.owner_email && hasPendingInvitation(apartment.owner_email)) || 
                   (apartment.tenant_email && hasPendingInvitation(apartment.tenant_email)) ? (
                    <span className="inline-flex items-center justify-center text-green-600" title="Υπάρχει ενεργή πρόσκληση">
                      <MailCheck className="w-4 h-4" />
                    </span>
                  ) : null}
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
          {/* Γραμμή αθροίσματος */}
          <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
            <td className="px-2 py-4 text-center text-sm font-bold text-blue-900 w-[55px]">
              ΣΎΝΟΛΟ
            </td>
            <td className="px-4 py-4 pr-6 text-sm text-blue-700">
              -
            </td>
            <td className={`px-4 py-4 text-center text-sm font-bold w-[55px] ${isOwnershipCorrect ? 'text-green-700' : 'text-red-700'}`}>
              <div className="flex items-center justify-center gap-1">
                <span>{totals.ownership}</span>
                {!isOwnershipCorrect && (
                  <span className="text-red-500 text-xs" title="Πρέπει να είναι 1000">⚠️</span>
                )}
              </div>
            </td>
            <td className={`px-4 py-4 text-center text-sm font-bold w-[55px] ${isHeatingCorrect ? 'text-green-700' : 'text-red-700'}`}>
              <div className="flex items-center justify-center gap-1">
                <span>{totals.heating}</span>
                {!isHeatingCorrect && (
                  <span className="text-red-500 text-xs" title="Πρέπει να είναι 1000">⚠️</span>
                )}
              </div>
            </td>
            <td className={`px-4 py-4 text-center text-sm font-bold w-[55px] ${isElevatorCorrect ? 'text-green-700' : 'text-red-700'}`}>
              <div className="flex items-center justify-center gap-1">
                <span>{totals.elevator}</span>
                {!isElevatorCorrect && (
                  <span className="text-red-500 text-xs" title="Πρέπει να είναι 1000">⚠️</span>
                )}
              </div>
            </td>
            <td className="px-4 py-4 pr-6 text-sm text-blue-700">
              -
            </td>
            <td className="px-4 py-4 text-sm text-blue-700">
              -
            </td>
            <td className="px-4 py-4 text-sm text-blue-700">
              -
            </td>
          </tr>
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
     </div>
   );
 } 