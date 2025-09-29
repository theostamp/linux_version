"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Euro, Calendar, Building } from "lucide-react";

type ServiceDeletionConfirmDialogProps = {
  open: boolean;
  maintenanceTitle?: string;
  relatedExpensesCount?: number;
  totalAmount?: number;
  isConfirmLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export function ServiceDeletionConfirmDialog({
  open,
  maintenanceTitle = "Έργο Υπηρεσιών",
  relatedExpensesCount = 0,
  totalAmount = 0,
  isConfirmLoading = false,
  onConfirm,
  onOpenChange,
}: ServiceDeletionConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Επιβεβαίωση Διαγραφής Έργου Υπηρεσιών
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Project Info */}
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Έργο:</span>
            </div>
            <p className="text-sm text-gray-900 font-medium">{maintenanceTitle}</p>
          </div>

          {/* Warning Message */}
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">⚠️ Προσοχή!</p>
                <p className="text-xs leading-relaxed">
                  Η διαγραφή αυτού του έργου θα αφαιρέσει <strong>όλες τις σχετικές δαπάνες και δόσεις</strong>. 
                  Ενδέχεται να παραμείνουν <strong>μη διανεμημένα ποσά</strong> στα διαμερίσματα που θα χρειαστούν 
                  <strong> χειροκίνητη διόρθωση</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Impact Summary */}
          {(relatedExpensesCount > 0 || totalAmount > 0) && (
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-sm font-medium text-orange-800 mb-2">Επίδραση Διαγραφής:</div>
              <div className="space-y-1 text-xs text-orange-700">
                {relatedExpensesCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-3 w-3" />
                    <span>Θα διαγραφούν {relatedExpensesCount} σχετικές δαπάνες</span>
                  </div>
                )}
                {totalAmount > 0 && (
                  <div className="flex items-center gap-2">
                    <Euro className="h-3 w-3" />
                    <span>Συνολικό ποσό: {totalAmount.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>Όλες οι μελλοντικές δόσεις θα ακυρωθούν</span>
                </div>
              </div>
            </div>
          )}

          {/* Final Warning */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Είστε <strong>σίγουροι</strong> ότι θέλετε να συνεχίσετε;
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isConfirmLoading}
            className="flex-1"
          >
            Άκυρο
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={isConfirmLoading}
            className="flex-1"
          >
            {isConfirmLoading ? "Διαγραφή..." : "Διαγραφή Έργου"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
