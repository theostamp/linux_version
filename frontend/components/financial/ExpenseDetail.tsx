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
  onDistribute?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const ExpenseDetail: React.FC<ExpenseDetailProps> = ({
  expense,
  onEdit,
  onDistribute,
  onDelete,
  showActions = true,
}) => {
  const getCategoryColor = (category: ExpenseCategory) => {
    const colors: Record<ExpenseCategory, string> = {
      [ExpenseCategory.ELECTRICITY]: 'bg-blue-100 text-blue-800',
      [ExpenseCategory.WATER]: 'bg-cyan-100 text-cyan-800',
      [ExpenseCategory.HEATING]: 'bg-orange-100 text-orange-800',
      [ExpenseCategory.CLEANING]: 'bg-green-100 text-green-800',
      [ExpenseCategory.MAINTENANCE]: 'bg-purple-100 text-purple-800',
      [ExpenseCategory.INSURANCE]: 'bg-red-100 text-red-800',
      [ExpenseCategory.ADMINISTRATION]: 'bg-gray-100 text-gray-800',
      [ExpenseCategory.OTHER]: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getDistributionLabel = (distribution: DistributionType) => {
    const labels: Record<DistributionType, string> = {
      [DistributionType.EQUAL]: 'Ισόποσα κατανομή',
      [DistributionType.MILLS]: 'Κατανομή ανά χιλιοστά',
      [DistributionType.METERS]: 'Κατανομή ανά μετρητές',
    };
    return labels[distribution] || 'Άγνωστη κατανομή';
  };

  const getCategoryLabel = (category: ExpenseCategory) => {
    const labels: Record<ExpenseCategory, string> = {
      [ExpenseCategory.ELECTRICITY]: 'Ηλεκτρισμός',
      [ExpenseCategory.WATER]: 'Νερό',
      [ExpenseCategory.HEATING]: 'Θέρμανση',
      [ExpenseCategory.CLEANING]: 'Καθαριότητα',
      [ExpenseCategory.MAINTENANCE]: 'Συντήρηση',
      [ExpenseCategory.INSURANCE]: 'Ασφάλεια',
      [ExpenseCategory.ADMINISTRATION]: 'Διοίκηση',
      [ExpenseCategory.OTHER]: 'Άλλο',
    };
    return labels[category] || category;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <span>Λεπτομέρειες Δαπάνης</span>
            <Badge className={getCategoryColor(expense.category)}>
              {getCategoryLabel(expense.category)}
            </Badge>
            {expense.is_distributed && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Κατανεμημένη
              </Badge>
            )}
          </CardTitle>
          {showActions && (
            <div className="flex gap-2">
              {!expense.is_distributed && onDistribute && (
                <Button onClick={onDistribute} variant="outline" size="sm">
                  Κατανάλωση
                </Button>
              )}
              {onEdit && (
                <Button onClick={onEdit} variant="outline" size="sm">
                  Επεξεργασία
                </Button>
              )}
              {onDelete && (
                <Button onClick={onDelete} variant="destructive" size="sm">
                  Διαγραφή
                </Button>
              )}
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
              <p className="text-lg">{expense.description}</p>
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
              <p className="text-lg">{getDistributionLabel(expense.distribution_type)}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Distribution Details */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Λεπτομέρειες Κατανομής</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Κατάσταση Κατανομής</label>
              <p className="text-lg">
                {expense.is_distributed ? 'Κατανεμημένη' : 'Μη κατανεμημένη'}
              </p>
            </div>
            {expense.distribution_date && (
              <div>
                <label className="text-sm font-medium text-gray-600">Ημερομηνία Κατανομής</label>
                <p className="text-lg">{formatDate(expense.distribution_date)}</p>
              </div>
            )}
            {expense.distribution_notes && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Σημειώσεις Κατανομής</label>
                <p className="text-lg">{expense.distribution_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {expense.notes && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3">Σημειώσεις</h3>
              <p className="text-lg text-gray-700">{expense.notes}</p>
            </div>
          </>
        )}

        {/* Metadata */}
        <Separator />
        <div>
          <h3 className="text-lg font-semibold mb-3">Μεταδεδομένα</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <label className="font-medium">Δημιουργήθηκε</label>
              <p>{formatDate(expense.created_at)}</p>
            </div>
            {expense.updated_at && expense.updated_at !== expense.created_at && (
              <div>
                <label className="font-medium">Τελευταία Ενημέρωση</label>
                <p>{formatDate(expense.updated_at)}</p>
              </div>
            )}
            {expense.created_by && (
              <div>
                <label className="font-medium">Δημιουργήθηκε από</label>
                <p>{expense.created_by}</p>
              </div>
            )}
            {expense.updated_by && expense.updated_by !== expense.created_by && (
              <div>
                <label className="font-medium">Ενημερώθηκε από</label>
                <p>{expense.updated_by}</p>
              </div>
            )}
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