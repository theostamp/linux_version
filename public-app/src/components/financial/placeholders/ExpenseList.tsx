'use client';

import React, { forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ExpenseListProps {
  buildingId: number;
  buildingName?: string;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  onExpenseSelect?: (expense: unknown) => void;
  showActions?: boolean;
  onAddExpense?: () => void;
}

export interface ExpenseListRef {
  refresh: () => void;
}

export const ExpenseList = forwardRef<ExpenseListRef, ExpenseListProps>(({
  buildingId,
  buildingName,
  selectedMonth,
  onMonthChange,
  onExpenseSelect,
  showActions,
  onAddExpense,
}, ref) => {
  useImperativeHandle(ref, () => ({
    refresh: () => {
      console.log('ExpenseList refresh called');
    },
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          ExpenseList - Under Development
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">
          Το ExpenseList component βρίσκεται υπό ανάπτυξη.
        </p>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Building ID: {buildingId}</p>
          {buildingName && <p>Building Name: {buildingName}</p>}
          {selectedMonth && <p>Selected Month: {selectedMonth}</p>}
        </div>
      </CardContent>
    </Card>
  );
});

ExpenseList.displayName = 'ExpenseList';
