'use client';

import React from 'react';
import { Building, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OfficeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OfficeSettingsModal({ isOpen, onClose }: OfficeSettingsModalProps) {
  const { user } = useAuth();

  // Simplified form - just show office info for now
  // Full implementation can be added later
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Ρυθμίσεις Γραφείου
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Όνομα Γραφείου</label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-900">{user?.office_name || 'Δεν έχει οριστεί'}</p>
            </div>
          </div>

          {user?.office_address && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Διεύθυνση
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900">{user.office_address}</p>
              </div>
            </div>
          )}

          {user?.office_phone && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Τηλέφωνο
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900">{user.office_phone}</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Η πλήρης λειτουργία επεξεργασίας θα προστεθεί σύντομα.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Κλείσιμο
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

