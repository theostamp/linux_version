'use client';

import { useState, useEffect } from 'react';
import { createInvitation, CreateInvitationPayload } from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
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
import { Loader2 } from 'lucide-react';

type InviteUserModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBuildingId?: number;
  defaultEmail?: string;
};

export default function InviteUserModal({ open, onOpenChange, defaultBuildingId, defaultEmail }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(defaultBuildingId || null);
  const [assignedRole, setAssignedRole] = useState<'resident' | 'internal_manager' | 'manager' | 'staff' | null>('resident');
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { buildings } = useBuilding();

  // Update form when defaultEmail or defaultBuildingId changes
  useEffect(() => {
    if (open) {
      if (defaultEmail) {
        setEmail(defaultEmail);
      }
      if (defaultBuildingId) {
        setSelectedBuildingId(defaultBuildingId);
      }
    } else {
      // Reset form when modal closes
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedBuildingId(defaultBuildingId || null);
      setAssignedRole('resident');
    }
  }, [open, defaultEmail, defaultBuildingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!email.trim()) {
      toast.error('Το email είναι υποχρεωτικό');
      setSubmitting(false);
      return;
    }

    // Validation: internal_manager requires building_id
    if (assignedRole === 'internal_manager' && !selectedBuildingId) {
      toast.error('Το κτίριο είναι υποχρεωτικό για εσωτερικό διαχειριστή');
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
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              Κτίριο {assignedRole === 'internal_manager' && '*'}
            </Label>
            <Select
              value={selectedBuildingId?.toString() || 'none'}
              onValueChange={(value) => setSelectedBuildingId(value === 'none' ? null : Number(value))}
              disabled={submitting}
            >
              <SelectTrigger id="building">
                <SelectValue placeholder="Επιλέξτε κτίριο (προαιρετικό)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Χωρίς κτίριο</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id.toString()}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignedRole === 'internal_manager' && (
              <p className="mt-1 text-xs text-amber-600">
                Το κτίριο είναι υποχρεωτικό για εσωτερικό διαχειριστή
              </p>
            )}
            {assignedRole === 'resident' && (
              <p className="mt-1 text-xs text-gray-500">
                Προαιρετικό: Αν επιλεγεί, ο χρήστης θα προστεθεί στο συγκεκριμένο κτίριο
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

