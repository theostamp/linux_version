'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Expense, ExpenseCategory, DistributionType } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FilePreview } from '@/components/ui/FilePreview';

interface ExpenseDetailProps {
  expense: Expense;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const ExpenseDetail: React.FC<ExpenseDetailProps> = ({
  expense,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const getCategoryColor = (category: ExpenseCategory) => {
    const colors: Partial<Record<ExpenseCategory, string>> = {
      [ExpenseCategory.ELECTRICITY_COMMON]: 'bg-blue-100 text-blue-800',
      [ExpenseCategory.WATER_COMMON]: 'bg-cyan-100 text-cyan-800',
      [ExpenseCategory.HEATING_FUEL]: 'bg-orange-100 text-orange-800',
      [ExpenseCategory.HEATING_GAS]: 'bg-orange-100 text-orange-800',
      [ExpenseCategory.CLEANING]: 'bg-green-100 text-green-800',
      [ExpenseCategory.MAINTENANCE_GENERAL]: 'bg-purple-100 text-purple-800',
      [ExpenseCategory.INSURANCE_BUILDING]: 'bg-red-100 text-red-800',
      [ExpenseCategory.MANAGEMENT_FEES]: 'bg-gray-100 text-gray-800',
      [ExpenseCategory.MISCELLANEOUS]: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getDistributionLabel = (distribution: DistributionType) => {
    const labels: Record<DistributionType, string> = {
      [DistributionType.EQUAL]: 'Ισόποσα κατανομή',
      [DistributionType.MILLS]: 'Κατανομή ανά χιλιοστά',
      [DistributionType.METERS]: 'Κατανομή ανά μετρητές',
      [DistributionType.SPECIFIC]: 'Συγκεκριμένα διαμερίσματα',
    };
    return labels[distribution] || 'Άγνωστη κατανομή';
  };

  const getCategoryLabel = (category: ExpenseCategory) => {
    const labels: Partial<Record<ExpenseCategory, string>> = {
      [ExpenseCategory.ELECTRICITY_COMMON]: 'Ηλεκτρισμός',
      [ExpenseCategory.WATER_COMMON]: 'Νερό',
      [ExpenseCategory.HEATING_FUEL]: 'Θέρμανση',
      [ExpenseCategory.HEATING_GAS]: 'Φυσικό Αέριο',
      [ExpenseCategory.CLEANING]: 'Καθαριότητα',
      [ExpenseCategory.MAINTENANCE_GENERAL]: 'Συντήρηση',
      [ExpenseCategory.INSURANCE_BUILDING]: 'Ασφάλεια',
      [ExpenseCategory.MANAGEMENT_FEES]: 'Διοίκηση',
      [ExpenseCategory.MISCELLANEOUS]: 'Άλλο',
    };
    return labels[category] || category;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <span>Λεπτομέρειες Δαπάνης</span>
            <Badge className={getCategoryColor(expense.category as ExpenseCategory)}>
              {getCategoryLabel(expense.category as ExpenseCategory)}
            </Badge>
          </CardTitle>

          {showActions && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                Επεξεργασία
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                Διαγραφή
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Βασικές Πληροφορίες</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Περιγραφή</label>
              <p className="text-lg">{expense.title || 'Δεν υπάρχει περιγραφή'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Ποσό</label>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(expense.amount)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Ημερομηνία Δαπάνης</label>
              <p className="text-lg">{formatDate(expense.date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Τύπος Κατανομής</label>
              <p className="text-lg">{getDistributionLabel(expense.distribution_type as DistributionType)}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Distribution Status */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Κατάσταση Κατανομής</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              Έτοιμη για κατανομή
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Ημερομηνία κατανομής:</span>
              <p className="font-medium">
                {formatDate(expense.date)}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Σημειώσεις:</span>
              <p className="font-medium">
                {expense.notes || 'Δεν υπάρχουν σημειώσεις'}
              </p>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-2 pt-4 border-t">
          <h3 className="text-lg font-semibold">Μεταδεδομένα</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Δημιουργήθηκε:</span>
              <p className="font-medium">
                {formatDate(expense.created_at)}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Τελευταία ενημέρωση:</span>
              <p className="font-medium">
                {expense.updated_at ? formatDate(expense.updated_at) : 'Δεν έχει ενημερωθεί'}
              </p>
            </div>
          </div>
        </div>

        {/* Attachments */}
        {expense.attachment && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3">Επισύναψη</h3>
              <FilePreview
                file={{
                  name: expense.attachment.split('/').pop() || 'Unknown file',
                  size: 0, // Size not available from URL
                  type: 'application/octet-stream',
                  url: expense.attachment_url || expense.attachment
                }}
                showPreview={true}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}; 