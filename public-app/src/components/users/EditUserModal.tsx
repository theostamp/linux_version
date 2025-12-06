'use client';

import { useState, useEffect } from 'react';
import { updateUser, UpdateUserPayload, User } from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type EditUserModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess?: () => void;
};

const roleOptions = [
  { value: 'resident', label: 'Ένοικος' },
  { value: 'internal_manager', label: 'Εσωτερικός Διαχειριστής' },
  { value: 'manager', label: 'Office Manager' },
  { value: 'staff', label: 'Staff' },
];

export default function EditUserModal({ open, onOpenChange, user, onSuccess }: EditUserModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      setEmail(user.email || '');
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setRole(user.role || '');
      setIsActive(user.is_active !== false);
    } else if (!open) {
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('');
      setIsActive(true);
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Δεν έχει επιλεγεί χρήστης');
      return;
    }

    setSubmitting(true);

    try {
      const payload: UpdateUserPayload = {
        email: email.trim() || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        role: role || undefined,
        is_active: isActive,
      };

      await updateUser(user.id, payload);
      
      toast.success('Ο χρήστης ενημερώθηκε επιτυχώς');
      
      if (onSuccess) {
        onSuccess();
      }
      
      onOpenChange(false);
    } catch (err) {
      const error = err as { 
        response?: { data?: Record<string, string | string[]> }; 
        message?: string;
      };
      
      let errorMessage = 'Αποτυχία ενημέρωσης χρήστη';
      
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
      
      if (errorMessage === 'Αποτυχία ενημέρωσης χρήστη' && error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Επεξεργασία Χρήστη</DialogTitle>
          <DialogDescription>
            Επεξεργαστείτε τα στοιχεία του χρήστη {user.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
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
            <Label htmlFor="role">Ρόλος</Label>
            <Select
              value={role}
              onValueChange={setRole}
              disabled={submitting}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Επιλέξτε ρόλο" />
              </SelectTrigger>
              <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
              disabled={submitting}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Ενεργός χρήστης
            </Label>
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
      </DialogContent>
    </Dialog>
  );
}

