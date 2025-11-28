'use client';

import { useState, useEffect, useMemo } from 'react';
import { createInvitation, CreateInvitationPayload, fetchApartments, ApartmentList } from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Home, User } from 'lucide-react';

type InviteUserModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBuildingId?: number;
  defaultEmail?: string;
};

// Τύπος για επιλογή από dropdown διαμερισμάτων
type ApartmentContact = {
  apartmentId: number;
  apartmentNumber: string;
  type: 'owner' | 'tenant';
  name: string;
  email: string;
};

export default function InviteUserModal({ open, onOpenChange, defaultBuildingId, defaultEmail }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(defaultBuildingId || null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(null);
  const [assignedRole, setAssignedRole] = useState<'resident' | 'internal_manager' | 'manager' | 'staff' | null>('resident');
  const [submitting, setSubmitting] = useState(false);
  const [selectedApartmentContact, setSelectedApartmentContact] = useState<string>('manual');
  const queryClient = useQueryClient();
  const { buildings, selectedBuilding } = useBuilding();

  // Υπολογισμός αν το κτίριο είναι υποχρεωτικό (για resident και internal_manager)
  const isBuildingRequired = assignedRole === 'resident' || assignedRole === 'internal_manager';

  // Fetch apartments για το επιλεγμένο κτίριο
  const { data: apartments = [], isLoading: isLoadingApartments } = useQuery({
    queryKey: ['apartments', selectedBuildingId],
    queryFn: () => fetchApartments(selectedBuildingId!),
    enabled: !!selectedBuildingId && open,
  });

  // Δημιουργία λίστας επαφών από τα διαμερίσματα (ιδιοκτήτες + ένοικοι με email)
  const apartmentContacts = useMemo((): ApartmentContact[] => {
    const contacts: ApartmentContact[] = [];
    
    apartments.forEach((apt) => {
      // Προσθήκη ιδιοκτήτη αν έχει email
      if (apt.owner_email && apt.owner_email.trim()) {
        contacts.push({
          apartmentId: apt.id,
          apartmentNumber: apt.number,
          type: 'owner',
          name: apt.owner_name || 'Ιδιοκτήτης',
          email: apt.owner_email.trim(),
        });
      }
      
      // Προσθήκη ενοίκου αν έχει email (και είναι διαφορετικό από τον ιδιοκτήτη)
      if (apt.tenant_email && apt.tenant_email.trim() && apt.tenant_email !== apt.owner_email) {
        contacts.push({
          apartmentId: apt.id,
          apartmentNumber: apt.number,
          type: 'tenant',
          name: apt.tenant_name || 'Ένοικος',
          email: apt.tenant_email.trim(),
        });
      }
    });
    
    // Ταξινόμηση κατά αριθμό διαμερίσματος
    return contacts.sort((a, b) => a.apartmentNumber.localeCompare(b.apartmentNumber, 'el', { numeric: true }));
  }, [apartments]);

  // Update form when defaultEmail or defaultBuildingId changes
  // Αυτόματη επιλογή του τρέχοντος κτιρίου αν δεν υπάρχει defaultBuildingId
  useEffect(() => {
    if (open) {
      if (defaultEmail) {
        setEmail(defaultEmail);
      }
      // Προτεραιότητα: defaultBuildingId > selectedBuilding > null
      if (defaultBuildingId) {
        setSelectedBuildingId(defaultBuildingId);
      } else if (selectedBuilding?.id) {
        // Αυτόματη επιλογή του τρέχοντος κτιρίου
        setSelectedBuildingId(selectedBuilding.id);
      }
    } else {
      // Reset form when modal closes
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedApartmentContact('manual');
      setSelectedApartmentId(null);
      // Επαναφορά στο τρέχον κτίριο ή default
      setSelectedBuildingId(defaultBuildingId || selectedBuilding?.id || null);
      setAssignedRole('resident');
    }
  }, [open, defaultEmail, defaultBuildingId, selectedBuilding?.id]);

  // Όταν αλλάζει η επιλογή διαμερίσματος, ενημέρωσε το email, το όνομα και το apartment_id
  const handleApartmentContactChange = (value: string) => {
    setSelectedApartmentContact(value);
    
    if (value === 'manual') {
      // Χειροκίνητη εισαγωγή - καθαρισμός
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedApartmentId(null);
      return;
    }
    
    // Βρες την επαφή από το value (format: "apartmentId-type")
    const [apartmentIdStr, type] = value.split('-');
    const apartmentId = parseInt(apartmentIdStr, 10);
    const contact = apartmentContacts.find(
      c => c.apartmentId === apartmentId && c.type === type
    );
    
    if (contact) {
      setEmail(contact.email);
      setSelectedApartmentId(contact.apartmentId);
      // Προσπάθεια διαχωρισμού ονόματος/επωνύμου
      const nameParts = contact.name.trim().split(' ');
      if (nameParts.length >= 2) {
        setFirstName(nameParts[0]);
        setLastName(nameParts.slice(1).join(' '));
      } else {
        setFirstName(contact.name);
        setLastName('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!email.trim()) {
      toast.error('Το email είναι υποχρεωτικό');
      setSubmitting(false);
      return;
    }

    // Validation: resident και internal_manager απαιτούν building_id
    if (isBuildingRequired && !selectedBuildingId) {
      const roleLabel = assignedRole === 'internal_manager' ? 'εσωτερικό διαχειριστή' : 'ένοικο';
      toast.error(`Το κτίριο είναι υποχρεωτικό για ${roleLabel}`);
      setSubmitting(false);
      return;
    }

    try {
      const payload: CreateInvitationPayload = {
        email: email.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        invitation_type: 'building_access',
        building_id: selectedBuildingId || undefined,
        apartment_id: selectedApartmentId || undefined,
        assigned_role: assignedRole || undefined,
      };

      await createInvitation(payload);
      
      // Invalidate invitations query
      await queryClient.invalidateQueries({ queryKey: ['invitations'] });
      
      toast.success('Η πρόσκληση στάλθηκε επιτυχώς');
      
      // Reset form
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedBuildingId(defaultBuildingId || null);
      setSelectedApartmentId(null);
      setSelectedApartmentContact('manual');
      setAssignedRole('resident');
      
      // Close modal
      onOpenChange(false);
    } catch (err) {
      // Handle various error formats from the API
      const error = err as { 
        response?: { data?: Record<string, string | string[]> }; 
        message?: string;
        email?: string[];
        detail?: string;
      };
      
      let errorMessage = 'Αποτυχία αποστολής πρόσκλησης';
      
      // Check for field-level validation errors (e.g., { email: ["error message"] })
      const errorData = error?.response?.data || error;
      if (errorData) {
        if (typeof errorData === 'object') {
          // Handle field validation errors like { email: ["Χρήστης με αυτό το email υπάρχει ήδη."] }
          const firstKey = Object.keys(errorData).find(key => 
            key !== 'response' && key !== 'message' && errorData[key]
          );
          if (firstKey) {
            const fieldError = errorData[firstKey];
            if (Array.isArray(fieldError) && fieldError.length > 0) {
              errorMessage = fieldError[0];
            } else if (typeof fieldError === 'string') {
              errorMessage = fieldError;
            }
          }
        }
      }
      
      // Fallback to generic message
      if (errorMessage === 'Αποτυχία αποστολής πρόσκλησης' && error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Πρόσκληση Νέου Χρήστη</DialogTitle>
          <DialogDescription>
            Στείλτε πρόσκληση σε νέο χρήστη για πρόσβαση στην εφαρμογή
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Επιλογή από διαμέρισμα ή χειροκίνητη εισαγωγή */}
          {assignedRole === 'resident' && selectedBuildingId && (
            <div>
              <Label htmlFor="apartmentContact" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Επιλογή από Διαμέρισμα
              </Label>
              <Select
                value={selectedApartmentContact}
                onValueChange={handleApartmentContactChange}
                disabled={submitting || isLoadingApartments}
              >
                <SelectTrigger id="apartmentContact">
                  <SelectValue placeholder={isLoadingApartments ? "Φόρτωση..." : "Επιλέξτε διαμέρισμα ή εισάγετε χειροκίνητα"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      Χειροκίνητη εισαγωγή
                    </span>
                  </SelectItem>
                  {apartmentContacts.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                        Διαμερίσματα με email
                      </div>
                      {apartmentContacts.map((contact) => (
                        <SelectItem 
                          key={`${contact.apartmentId}-${contact.type}`} 
                          value={`${contact.apartmentId}-${contact.type}`}
                        >
                          <span className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Δ.{contact.apartmentNumber}</span>
                            <span className="text-gray-500">-</span>
                            <span>{contact.name}</span>
                            <span className="text-xs text-gray-400">
                              ({contact.type === 'owner' ? 'Ιδιοκτήτης' : 'Ένοικος'})
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {apartmentContacts.length === 0 && !isLoadingApartments && (
                    <div className="px-2 py-1.5 text-xs text-gray-500 italic">
                      Δεν βρέθηκαν διαμερίσματα με email
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-gray-500">
                Επιλέξτε διαμέρισμα για αυτόματη συμπλήρωση στοιχείων
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Αν ο χρήστης πληκτρολογεί, επαναφορά σε χειροκίνητη εισαγωγή
                if (selectedApartmentContact !== 'manual') {
                  setSelectedApartmentContact('manual');
                }
              }}
              placeholder="user@example.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Όνομα</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Όνομα"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Επώνυμο</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Επώνυμο"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="role">Ρόλος *</Label>
            <Select
              value={assignedRole || 'resident'}
              onValueChange={(value) => setAssignedRole(value as 'resident' | 'internal_manager' | 'manager' | 'staff')}
              disabled={submitting}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Επιλέξτε ρόλο" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resident">Ένοικος</SelectItem>
                <SelectItem value="internal_manager">Εσωτερικός Διαχειριστής</SelectItem>
                <SelectItem value="manager">Office Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="building">
              Κτίριο {isBuildingRequired && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={selectedBuildingId?.toString() || 'none'}
              onValueChange={(value) => setSelectedBuildingId(value === 'none' ? null : Number(value))}
              disabled={submitting}
            >
              <SelectTrigger id="building">
                <SelectValue placeholder={isBuildingRequired ? "Επιλέξτε κτίριο" : "Επιλέξτε κτίριο (προαιρετικό)"} />
              </SelectTrigger>
              <SelectContent>
                {/* Εμφάνιση "Χωρίς κτίριο" μόνο αν δεν είναι υποχρεωτικό */}
                {!isBuildingRequired && (
                  <SelectItem value="none">Χωρίς κτίριο</SelectItem>
                )}
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id.toString()}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isBuildingRequired && (
              <p className="mt-1 text-xs text-amber-600">
                Το κτίριο είναι υποχρεωτικό για {assignedRole === 'internal_manager' ? 'εσωτερικό διαχειριστή' : 'ένοικο'}
              </p>
            )}
            {!isBuildingRequired && (
              <p className="mt-1 text-xs text-gray-500">
                Προαιρετικό για managers και staff
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Ακύρωση
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Αποστολή...
                </>
              ) : (
                'Αποστολή Πρόσκλησης'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

