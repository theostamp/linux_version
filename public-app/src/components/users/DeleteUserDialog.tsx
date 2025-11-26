'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { User } from '@/lib/api';

type DeleteUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => void | Promise<void>;
};

export default function DeleteUserDialog({ open, onOpenChange, user, onConfirm }: DeleteUserDialogProps) {
  if (!user) {
    return null;
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Διαγραφή Χρήστη"
      description={`Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη ${user.email}? Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`}
      confirmText="Διαγραφή"
      cancelText="Άκυρο"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  );
}

