'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, Loader2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteUser } from '@/lib/api';
import { toast } from 'sonner';

interface DeleteUserSectionProps {
  userId?: number | null;
  userEmail?: string;
  userName?: string;
  apartmentNumber: string;
  userType: 'owner' | 'tenant';
  onSuccess?: () => void;
}

export default function DeleteUserSection({
  userId,
  userEmail,
  userName,
  apartmentNumber,
  userType,
  onSuccess,
}: DeleteUserSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Don't show if no registered user
  if (!userId || !userEmail) {
    return null;
  }

  const userTypeLabel = userType === 'owner' ? 'ιδιοκτήτη' : 'ενοίκου';
  const userTypeLabelCaps = userType === 'owner' ? 'Ιδιοκτήτη' : 'Ενοίκου';

  const handleDelete = async () => {
    if (confirmEmail !== userEmail) {
      toast.error('Το email δεν ταιριάζει. Παρακαλώ πληκτρολογήστε το σωστό email.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUser(userId);
      toast.success(`Ο χρήστης ${userEmail} διαγράφηκε επιτυχώς`);
      setDialogOpen(false);
      setConfirmEmail('');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const error = err as { message?: string; response?: { data?: { error?: string } } };
      const errorMessage = error?.response?.data?.error || error?.message || 'Αποτυχία διαγραφής χρήστη';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Danger Zone Section */}
      <div className="mt-6 pt-6 border-t-2 border-red-200">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 mb-1">
                Επικίνδυνη Ζώνη - Διαγραφή {userTypeLabelCaps}
              </h4>
              <p className="text-sm text-red-700 mb-3">
                Η διαγραφή του χρήστη <strong>{userEmail}</strong> θα τον αφαιρέσει
                <strong> από όλα τα κτίρια</strong> στα οποία είναι καταχωρημένος.
                Το διαμέρισμα {apartmentNumber} θα παραμείνει αλλά θα σημανθεί ως <strong>κενό</strong>.
              </p>
              <p className="text-xs text-red-600 mb-3">
                ⚠️ Αυτή η ενέργεια είναι <strong>μη αναστρέψιμη</strong>.
                Ο χρήστης θα χάσει πρόσβαση σε όλα τα κτίρια και δεδομένα.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <UserX className="h-4 w-4 mr-2" />
                Διαγραφή Χρήστη
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl text-red-800">
                Οριστική Διαγραφή Χρήστη
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-800 mb-2">
                    Πρόκειται να διαγράψετε οριστικά τον χρήστη:
                  </p>
                  <div className="bg-white rounded p-3 border border-red-100">
                    <p className="font-bold text-gray-900">{userName || 'Άγνωστο όνομα'}</p>
                    <p className="text-gray-600">{userEmail}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {userType === 'owner' ? 'Ιδιοκτήτης' : 'Ένοικος'} Διαμερίσματος {apartmentNumber}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-800">Τι θα συμβεί:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Ο χρήστης θα διαγραφεί <strong>οριστικά</strong> από το σύστημα</li>
                    <li>Θα αφαιρεθεί από <strong>όλα τα κτίρια</strong> που ήταν καταχωρημένος</li>
                    <li>Το διαμέρισμα {apartmentNumber} θα σημανθεί ως <strong>κενό</strong></li>
                    <li>Όλα τα δεδομένα του χρήστη θα χαθούν</li>
                    <li>Δεν θα μπορεί να συνδεθεί ξανά με τα ίδια στοιχεία</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Σημείωση:</strong> Αν θέλετε απλά να αφαιρέσετε τον {userTypeLabel} από αυτό το διαμέρισμα
                    χωρίς να τον διαγράψετε, χρησιμοποιήστε την επεξεργασία για να αδειάσετε τα πεδία.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="confirmEmail" className="text-sm font-medium text-gray-700">
                    Για επιβεβαίωση, πληκτρολογήστε το email του χρήστη:
                  </Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder={userEmail}
                    className="border-red-200 focus:border-red-400"
                  />
                  <p className="text-xs text-gray-500">
                    Πληκτρολογήστε: <code className="bg-gray-100 px-1 py-0.5 rounded">{userEmail}</code>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => setConfirmEmail('')}
              disabled={isDeleting}
            >
              Ακύρωση
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={confirmEmail !== userEmail || isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Διαγραφή...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Διαγραφή Οριστικά
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
