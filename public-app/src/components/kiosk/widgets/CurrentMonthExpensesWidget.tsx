'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Euro } from 'lucide-react';
import { useMemo } from 'react';

export default function CurrentMonthExpensesWidget({ data, isLoading, error, buildingId }: BaseWidgetProps & { buildingId?: number | null }) {
  const totalObligations =
    typeof data?.financial?.total_obligations === 'number' ? data.financial.total_obligations : 0;
  const pendingCount = useMemo(() => {
    const statuses = data?.financial?.apartment_statuses;
    if (!Array.isArray(statuses)) return 0;
    return statuses.filter((item) => Boolean(item?.has_pending)).length;
  }, [data]);

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

  const totalAmount = Math.max(0, totalObligations);

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {/* Simple Total Display - No breakdown */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Euro className="w-6 h-6 text-green-400" />
          <span className="text-sm text-green-200/80 uppercase tracking-wider">
            Σύνολο Οφειλών
          </span>
        </div>

        {totalAmount > 0 ? (
          <div className="text-4xl font-bold text-white">
            €{totalAmount.toFixed(2)}
          </div>
        ) : (
          <div className="text-green-200/50">
            <p className="text-lg">Δεν υπάρχουν οφειλές</p>
          </div>
        )}

        {pendingCount > 0 && (
          <p className="text-xs text-green-300/60 mt-2">
            {pendingCount} {pendingCount === 1 ? 'διαμέρισμα' : 'διαμερίσματα'} με εκκρεμότητες
          </p>
        )}
      </div>
    </div>
  );
}
