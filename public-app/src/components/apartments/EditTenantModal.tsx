'use client';

import { useState, useEffect } from 'react';
import { updateApartmentTenant, UpdateTenantData, ApartmentList } from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type EditTenantModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartment: ApartmentList | null;
  onSuccess?: () => void;
};

export default function EditTenantModal({ open, onOpenChange, apartment, onSuccess }: EditTenantModalProps) {
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantPhone2, setTenantPhone2] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [isRented, setIsRented] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [rentStartDate, setRentStartDate] = useState('');
  const [rentEndDate, setRentEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Update form when apartment changes
  useEffect(() => {
    if (open && apartment) {
      setTenantName(apartment.tenant_name || '');
      setTenantPhone(apartment.tenant_phone || '');
      setTenantPhone2(apartment.tenant_phone2 || '');
      setTenantEmail(apartment.tenant_email || '');
      setIsRented(apartment.is_rented || false);
      setIsClosed(apartment.is_closed || false);
      setRentStartDate(apartment.rent_start_date ? apartment.rent_start_date.split('T')[0] : '');
      setRentEndDate(apartment.rent_end_date ? apartment.rent_end_date.split('T')[0] : '');
    } else if (!open) {
      // Reset form when modal closes
      setTenantName('');
      setTenantPhone('');
      setTenantPhone2('');
      setTenantEmail('');
      setIsRented(false);
      setIsClosed(false);
      setRentStartDate('');
      setRentEndDate('');
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
      const tenantData: UpdateTenantData = {
        // NOTE: Send empty strings to allow clearing fields (undefined would be omitted from JSON)
        tenant_name: tenantName.trim(),
        tenant_phone: tenantPhone.trim(),
        tenant_phone2: tenantPhone2.trim(),
        tenant_email: tenantEmail.trim(),
        is_rented: isRented,
        is_closed: isClosed,
        rent_start_date: rentStartDate || null,
        rent_end_date: rentEndDate || null,
      };

      await updateApartmentTenant(apartment.id, tenantData);

      toast.success('Τα στοιχεία του ενοίκου ενημερώθηκαν επιτυχώς');

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

      let errorMessage = 'Αποτυχία ενημέρωσης στοιχείων ενοίκου';

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

      if (errorMessage === 'Αποτυχία ενημέρωσης στοιχείων ενοίκου' && error?.message) {
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
          <DialogTitle>Ενημέρωση Στοιχείων Ενοίκου</DialogTitle>
          <DialogDescription>
            Επεξεργαστείτε τα στοιχεία του ενοίκου για το διαμέρισμα {apartment.number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tenantName">Όνομα Ενοίκου</Label>
            <Input
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Όνομα ενοίκου"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tenantPhone">Τηλέφωνο</Label>
              <Input
                id="tenantPhone"
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                placeholder="2101234567"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="tenantPhone2">Επιπλέον Τηλέφωνο</Label>
              <Input
                id="tenantPhone2"
                value={tenantPhone2}
                onChange={(e) => setTenantPhone2(e.target.value)}
                placeholder="2101234567"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tenantEmail">Email</Label>
            <Input
              id="tenantEmail"
              type="email"
              value={tenantEmail}
              onChange={(e) => setTenantEmail(e.target.value)}
              placeholder="tenant@example.com"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rentStartDate">Ημερομηνία Έναρξης Ενοικίασης</Label>
              <Input
                id="rentStartDate"
                type="date"
                value={rentStartDate}
                onChange={(e) => setRentStartDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="rentEndDate">Ημερομηνία Λήξης Ενοικίασης</Label>
              <Input
                id="rentEndDate"
                type="date"
                value={rentEndDate}
                onChange={(e) => setRentEndDate(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRented"
                checked={isRented}
                onCheckedChange={(checked) => setIsRented(checked === true)}
                disabled={submitting}
              />
              <Label htmlFor="isRented" className="cursor-pointer">
                Ενοικιασμένο
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isClosed"
                checked={isClosed}
                onCheckedChange={(checked) => setIsClosed(checked === true)}
                disabled={submitting}
              />
              <Label htmlFor="isClosed" className="cursor-pointer">
                Κλειστό
              </Label>
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
        {apartment.tenant_user && (
          <DeleteUserSection
            userId={apartment.tenant_user}
            userEmail={apartment.tenant_email || undefined}
            userName={apartment.tenant_name || undefined}
            apartmentNumber={apartment.number}
            userType="tenant"
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
