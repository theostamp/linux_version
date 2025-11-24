'use client';

import React, { useState } from 'react';
import { Building, Phone, Mail, MapPin, Info } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getOfficeLogoUrl } from '@/lib/utils';

interface OfficeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OfficeSettingsModal({ isOpen, onClose }: OfficeSettingsModalProps) {
  const { user } = useAuth();
  const [logoError, setLogoError] = useState(false);
  
  if (!isOpen) return null;

  const logoUrl = getOfficeLogoUrl(user?.office_logo);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Ρυθμίσεις Γραφείου
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Logo */}
          <div className="space-y-2">
            {logoUrl && !logoError ? (
              <div className="flex justify-center pb-2">
                <div className="w-24 h-24 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-gray-50 border border-gray-200">
                  <img
                    src={logoUrl}
                    alt="Logo Γραφείου"
                    className="w-full h-full object-contain"
                    onLoad={() => setLogoError(false)}
                    onError={() => setLogoError(true)}
                  />
                </div>
              </div>
            ) : logoUrl ? null : null}
            
            {/* Σημείωση για βέλτιστες διαστάσεις logo */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold mb-1">Βέλτιστες διαστάσεις για το Logo:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>Τετράγωνη μορφή (1:1 aspect ratio)</li>
                  <li>Συνιστώμενες διαστάσεις: <strong>512x512px</strong> ή <strong>1024x1024px</strong></li>
                  <li>Μορφή αρχείου: <strong>PNG</strong> (με transparency) ή <strong>SVG</strong></li>
                  <li>Μέγιστο μέγεθος αρχείου: <strong>2MB</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Όνομα Γραφείου */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Όνομα Γραφείου
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-900">{user?.office_name || 'Δεν έχει οριστεί'}</p>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-900">{user?.email || 'Δεν έχει οριστεί'}</p>
            </div>
          </div>

          {/* Διεύθυνση */}
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

          {/* Κύριο Τηλέφωνο */}
          {user?.office_phone && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Τηλέφωνο (Κύριο)
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900">{user.office_phone}</p>
              </div>
            </div>
          )}

          {/* Τηλέφωνο Ανάγκης */}
          {user?.office_phone_emergency && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Τηλέφωνο (Ανάγκης)
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900">{user.office_phone_emergency}</p>
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

