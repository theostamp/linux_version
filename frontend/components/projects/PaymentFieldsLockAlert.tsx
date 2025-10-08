'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertCircle, Receipt } from 'lucide-react';

interface PaymentFieldsLockAlertProps {
  isLocked: boolean;
  reason?: string | null;
  expensesCount?: number;
  className?: string;
}

export function PaymentFieldsLockAlert({
  isLocked,
  reason,
  expensesCount,
  className = '',
}: PaymentFieldsLockAlertProps) {
  if (!isLocked) {
    return null;
  }

  return (
    <Alert variant="warning" className={className}>
      <Lock className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Τα πεδία πληρωμής είναι κλειδωμένα
        {expensesCount && expensesCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            <Receipt className="h-3 w-3 mr-1" />
            {expensesCount} δαπάνες
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{reason || 'Δεν είναι δυνατή η επεξεργασία'}</p>
            <p className="text-sm mt-1 text-muted-foreground">
              Οι αλλαγές στα πεδία πληρωμής (δόσεις, προκαταβολή) <strong>δεν θα ενημερώσουν</strong> τις υπάρχουσες δαπάνες αυτόματα.
            </p>
            {expensesCount && expensesCount > 0 && (
              <p className="text-sm mt-2 text-muted-foreground">
                💡 <strong>Συμβουλή:</strong> Χρησιμοποιήστε το κουμπί "Επανασυγχρονισμός Δαπανών" για να ενημερώσετε τις δαπάνες με τα νέα δεδομένα.
              </p>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
