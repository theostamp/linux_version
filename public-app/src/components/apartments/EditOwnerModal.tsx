'use client';

import { useState, useEffect } from 'react';
import { updateApartmentOwner, UpdateOwnerData, ApartmentList } from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import DeleteUserSection from './DeleteUserSection';

type EditOwnerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartment: ApartmentList | null;
  onSuccess?: () => void;
};

export default function EditOwnerModal({ open, onOpenChange, apartment, onSuccess }: EditOwnerModalProps) {
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPhone2, setOwnerPhone2] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [participationMills, setParticipationMills] = useState<number | ''>('');
  const [heatingMills, setHeatingMills] = useState<number | ''>('');
  const [elevatorMills, setElevatorMills] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // Update form when apartment changes
  useEffect(() => {
    if (open && apartment) {
      setOwnerName(apartment.owner_name || '');
      setOwnerPhone(apartment.owner_phone || '');
      setOwnerPhone2(apartment.owner_phone2 || '');
      setOwnerEmail(apartment.owner_email || '');
      setIdentifier(apartment.identifier || '');
      setParticipationMills(apartment.participation_mills ?? '');
      setHeatingMills(apartment.heating_mills ?? '');
      setElevatorMills(apartment.elevator_mills ?? '');
    } else if (!open) {
      // Reset form when modal closes
      setOwnerName('');
      setOwnerPhone('');
      setOwnerPhone2('');
      setOwnerEmail('');
      setIdentifier('');
      setParticipationMills('');
      setHeatingMills('');
      setElevatorMills('');
    }
  }, [open, apartment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apartment) {
      toast.error('Δεν έχει επιλεγεί διαμέρισμα');
      return;
    }

    setSubmitting(true);

    try {
      const ownerData: UpdateOwnerData = {
        owner_name: ownerName.trim() || undefined,
        owner_phone: ownerPhone.trim() || undefined,
        owner_phone2: ownerPhone2.trim() || undefined,
        owner_email: ownerEmail.trim() || undefined,
        identifier: identifier.trim() || undefined,
        participation_mills: participationMills !== '' ? Number(participationMills) : undefined,
        heating_mills: heatingMills !== '' ? Number(heatingMills) : undefined,
        elevator_mills: elevatorMills !== '' ? Number(elevatorMills) : undefined,
      };

      await updateApartmentOwner(apartment.id, ownerData);
      
      toast.success('Τα στοιχεία του ιδιοκτήτη ενημερώθηκαν επιτυχώς');
      
      // Call success callback to refresh data
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onOpenChange(false);
    } catch (err) {
      const error = err as { 
        response?: { data?: Record<string, string | string[]> }; 
        message?: string;
        detail?: string;
      };
      
      let errorMessage = 'Αποτυχία ενημέρωσης στοιχείων ιδιοκτήτη';
      
      const errorData = error?.response?.data || error;
      if (errorData) {
        if (typeof errorData === 'object') {
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
      
      if (errorMessage === 'Αποτυχία ενημέρωσης στοιχείων ιδιοκτήτη' && error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!apartment) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ενημέρωση Στοιχείων Ιδιοκτήτη</DialogTitle>
          <DialogDescription>
            Επεξεργαστείτε τα στοιχεία του ιδιοκτήτη για το διαμέρισμα {apartment.number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ownerName">Όνομα Ιδιοκτήτη</Label>
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Όνομα ιδιοκτήτη"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ownerPhone">Τηλέφωνο</Label>
              <Input
                id="ownerPhone"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="2101234567"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="ownerPhone2">Επιπλέον Τηλέφωνο</Label>
              <Input
                id="ownerPhone2"
                value={ownerPhone2}
                onChange={(e) => setOwnerPhone2(e.target.value)}
                placeholder="2101234567"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ownerEmail">Email</Label>
            <Input
              id="ownerEmail"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="owner@example.com"
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="identifier">Αναγνωριστικό</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Α1, Β2, κλπ"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="participationMills">Συμμετοχή (‰)</Label>
              <Input
                id="participationMills"
                type="number"
                value={participationMills}
                onChange={(e) => setParticipationMills(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="100"
                min="0"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="heatingMills">Θέρμανση (‰)</Label>
              <Input
                id="heatingMills"
                type="number"
                value={heatingMills}
                onChange={(e) => setHeatingMills(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="100"
                min="0"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="elevatorMills">Ανελκυστήρας (‰)</Label>
              <Input
                id="elevatorMills"
                type="number"
                value={elevatorMills}
                onChange={(e) => setElevatorMills(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="100"
                min="0"
                disabled={submitting}
              />
            </div>
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
                  Ενημέρωση...
                </>
              ) : (
                'Ενημέρωση'
              )}
            </Button>
          </DialogFooter>
        </form>

        {/* Danger Zone - Delete User */}
        {apartment.owner_user && (
          <DeleteUserSection
            userId={apartment.owner_user}
            userEmail={apartment.owner_email || undefined}
            userName={apartment.owner_name || undefined}
            apartmentNumber={apartment.number}
            userType="owner"
            onSuccess={() => {
              onOpenChange(false);
              if (onSuccess) onSuccess();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

