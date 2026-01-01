'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Euro } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { useMemo } from 'react';

export default function CurrentMonthExpensesWidget({ data, isLoading, error, buildingId }: BaseWidgetProps & { buildingId?: number | null }) {
  // Get expenses from data prop (from useKioskData hook)
  const expenses = useMemo(() => {
    const expensesData = data?.financial?.current_month_expenses || [];
    return expensesData;
  }, [data]);

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: el });
  const periodInfo = data?.financial?.current_month_period;

  const periodLabel = useMemo(() => {
    if (periodInfo?.is_fallback) {
      return 'Πρόσφατες';
    }
    if (periodInfo?.start) {
      try {
        return format(new Date(periodInfo.start), 'MMMM yyyy', { locale: el });
      } catch {
        return currentMonth;
      }
    }
    return currentMonth;
  }, [periodInfo, currentMonth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-xl mb-2">⚠️</div>
          <p className="text-xs">Σφάλμα φόρτωσης δεδομένων</p>
        </div>
      </div>
    );
  }

  const totalAmount = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {/* Simple Total Display - No breakdown */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Euro className="w-6 h-6 text-green-400" />
          <span className="text-sm text-green-200/80 uppercase tracking-wider">
            Δαπάνες {periodLabel}
          </span>
        </div>

        {totalAmount > 0 ? (
          <div className="text-4xl font-bold text-white">
            €{totalAmount.toFixed(2)}
          </div>
        ) : (
          <div className="text-green-200/50">
            <p className="text-lg">Δεν υπάρχουν δαπάνες</p>
          </div>
        )}

        {expenses.length > 0 && (
          <p className="text-xs text-green-300/60 mt-2">
            {expenses.length} {expenses.length === 1 ? 'δαπάνη' : 'δαπάνες'}
          </p>
        )}
      </div>
    </div>
  );
}
