'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building, Phone, Mail, MapPin, Info, Upload, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getOfficeLogoUrl } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { User } from '@/types/user';

interface OfficeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormState = {
  office_name: string;
  office_phone: string;
  office_phone_emergency: string;
  office_address: string;
};

export default function OfficeSettingsModal({ isOpen, onClose }: OfficeSettingsModalProps) {
  const { user, refreshUser } = useAuth();
  const [logoError, setLogoError] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formState, setFormState] = useState<FormState>({
    office_name: '',
    office_phone: '',
    office_phone_emergency: '',
    office_address: '',
  });

  // Initialize form state from user data
  useEffect(() => {
    if (user && isOpen) {
      setFormState({
        office_name: user.office_name || '',
        office_phone: user.office_phone || '',
        office_phone_emergency: user.office_phone_emergency || '',
        office_address: user.office_address || '',
      });
      setLogoFile(null);
      setLogoPreview(null);
      setLogoError(false);
    }
  }, [user, isOpen]);

  const logoUrl = getOfficeLogoUrl(user?.office_logo);
  const displayLogoUrl = logoPreview || (logoUrl && !logoError ? logoUrl : null);

  const handleChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 2MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Μη υποστηριζόμενος τύπος αρχείου. Χρησιμοποιήστε PNG, JPG ή SVG');
      return;
    }

    setLogoFile(file);
    setLogoError(false);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Create FormData for multipart/form-data (needed for file upload)
      const formData = new FormData();
      
      // Add text fields
      formData.append('office_name', formState.office_name);
      formData.append('office_phone', formState.office_phone);
      if (formState.office_phone_emergency) {
        formData.append('office_phone_emergency', formState.office_phone_emergency);
      }
      formData.append('office_address', formState.office_address);

      // Add logo file if selected
      if (logoFile) {
        formData.append('office_logo', logoFile);
        console.log('[OfficeSettings] Sending logo file:', logoFile.name, logoFile.size, logoFile.type);
      } else {
        console.log('[OfficeSettings] No logo file to send');
      }

      // Debug: Log FormData contents
      console.log('[OfficeSettings] FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      // Use api.patch which handles FormData automatically
      // Note: /users/me/ only supports GET, use /users/office-details/ for updates
      // The endpoint returns { message, office_details } but we refresh the full user data anyway
      console.log('[OfficeSettings] Sending PATCH request to /users/office-details/');
      console.log('[OfficeSettings] FormData has logo:', !!logoFile);
      
      // Retry logic for network errors
      let lastError: unknown = null;
      const maxRetries = 2;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[OfficeSettings] Retry attempt ${attempt}/${maxRetries}`);
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
          
          const response = await api.patch<{ message: string; office_details: any }>('/users/office-details/', formData);
          console.log('[OfficeSettings] PATCH request successful:', response);

        // Refresh user data in AuthContext to get updated values
        await refreshUser();

        toast.success('Οι ρυθμίσεις αποθηκεύτηκαν με επιτυχία', {
          description: 'Τα στοιχεία του γραφείου ενημερώθηκαν.',
        });

          onClose();
          return; // Success, exit retry loop
        } catch (patchError) {
          lastError = patchError;
          console.error(`[OfficeSettings] PATCH request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, patchError);
          
          // Check if it's a network error that we should retry
          const isNetworkError = patchError instanceof Error && (
            patchError.message.includes('Failed to fetch') || 
            patchError.message.includes('ERR_NAME_NOT_RESOLVED') ||
            patchError.message.includes('NetworkError') ||
            patchError.message.includes('network')
          );
          
          // Only retry network errors, not validation errors
          if (!isNetworkError || attempt === maxRetries) {
            throw patchError; // Re-throw to be caught by outer catch
          }
          
          // Continue to next retry attempt
        }
      }
      
      // If we get here, all retries failed
      throw lastError;
    } catch (error) {
      console.error('Error updating office settings:', error);
      
      let errorMessage = 'Παρακαλώ δοκιμάστε ξανά.';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('ERR_NAME_NOT_RESOLVED') ||
            error.message.includes('NetworkError')) {
          errorMessage = 'Σφάλμα σύνδεσης με τον server. Παρακαλώ ελέγξτε τη σύνδεσή σας.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Μη έγκυρα δεδομένα. Παρακαλώ ελέγξτε τα πεδία.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Δεν έχετε δικαίωμα να εκτελέσετε αυτή την ενέργεια.';
        } else if (error.message.includes('413') || error.message.includes('too large')) {
          errorMessage = 'Το αρχείο logo είναι πολύ μεγάλο. Μέγιστο μέγεθος: 2MB.';
        }
      }
      
      toast.error('Σφάλμα κατά την αποθήκευση', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (user) {
      setFormState({
        office_name: user.office_name || '',
        office_phone: user.office_phone || '',
        office_phone_emergency: user.office_phone_emergency || '',
        office_address: user.office_address || '',
      });
    }
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Ρυθμίσεις Γραφείου
          </DialogTitle>
          <DialogDescription>
            Επεξεργαστείτε τα στοιχεία του γραφείου διαχείρισης
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Logo Γραφείου</Label>
            
            {displayLogoUrl && (
              <div className="flex justify-center pb-2">
                <div className="relative w-24 h-24 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-gray-50 border border-gray-200">
                  <img
                    src={displayLogoUrl}
                    alt="Logo Γραφείου"
                    className="w-full h-full object-contain"
                    onLoad={() => setLogoError(false)}
                    onError={() => setLogoError(true)}
                  />
                  {logoFile && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Αφαίρεση logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoChange}
                className="text-sm"
                disabled={isSubmitting}
              />
            </div>
            
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
            <Label htmlFor="office_name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Όνομα Γραφείου
            </Label>
            <Input
              id="office_name"
              value={formState.office_name}
              onChange={handleChange('office_name')}
              placeholder="Π.χ. Theo Concierge"
              disabled={isSubmitting}
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-900">{user?.email || 'Δεν έχει οριστεί'}</p>
            </div>
            <p className="text-xs text-gray-500">Το email δεν μπορεί να αλλάξει από εδώ.</p>
          </div>

          {/* Διεύθυνση */}
          <div className="space-y-2">
            <Label htmlFor="office_address" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Διεύθυνση
            </Label>
            <Textarea
              id="office_address"
              value={formState.office_address}
              onChange={handleChange('office_address')}
              placeholder="Οδός, αριθμός, πόλη, Τ.Κ."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Κύριο Τηλέφωνο */}
          <div className="space-y-2">
            <Label htmlFor="office_phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Τηλέφωνο (Κύριο)
            </Label>
            <Input
              id="office_phone"
              value={formState.office_phone}
              onChange={handleChange('office_phone')}
              placeholder="+30 210 0000000"
              disabled={isSubmitting}
            />
          </div>

          {/* Τηλέφωνο Ανάγκης */}
          <div className="space-y-2">
            <Label htmlFor="office_phone_emergency" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Τηλέφωνο (Ανάγκης)
            </Label>
            <Input
              id="office_phone_emergency"
              value={formState.office_phone_emergency}
              onChange={handleChange('office_phone_emergency')}
              placeholder="+30 210 0000000"
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Ακύρωση
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                'Αποθήκευση'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
