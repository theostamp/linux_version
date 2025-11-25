'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Euro, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { useEffect, useState } from 'react';

export default function CurrentMonthExpensesWidget({ data, isLoading, error, buildingId }: BaseWidgetProps & { buildingId?: number | null }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);

  useEffect(() => {
    if (!buildingId) return;

    const fetchCurrentMonthExpenses = async () => {
      setIsLoadingExpenses(true);
      try {
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const startDate = `${currentMonth}-01`;
        const endDate = `${currentMonth}-31`;

        const response = await fetch(
          `/api/financial/expenses/?building=${buildingId}&expense_date_after=${startDate}&expense_date_before=${endDate}&page_size=10`
        );

        if (response.ok) {
          const result = await response.json();
          const expensesList = result.results || result || [];
          setExpenses(expensesList);
        }
      } catch (err) {
        console.error('Error fetching expenses:', err);
      } finally {
        setIsLoadingExpenses(false);
      }
    };

    fetchCurrentMonthExpenses();
    // Refresh every 5 minutes
    const interval = setInterval(fetchCurrentMonthExpenses, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [buildingId]);

  if (isLoading || isLoadingExpenses) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
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

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: el });
  const totalAmount = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const topExpenses = expenses.slice(0, 5);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-500/20">
        <div className="flex items-center space-x-2">
          <Euro className="w-5 h-5 text-green-300" />
          <h3 className="text-lg font-semibold text-white">Δαπάνες {currentMonth}</h3>
        </div>
        <Calendar className="w-4 h-4 text-green-300" />
      </div>

      {/* Total Amount */}
      <div className="mb-4 p-3 bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-lg border border-green-500/30">
        <div className="flex items-center justify-between">
          <span className="text-sm text-green-200">Συνολική Δαπάνη</span>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-300" />
            <span className="text-xl font-bold text-white">
              €{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="text-xs text-green-300/70 mt-1">
          {expenses.length} {expenses.length === 1 ? 'δαπάνη' : 'δαπάνες'}
        </div>
      </div>

      {/* Top Expenses List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {topExpenses.length === 0 ? (
          <div className="flex items-center justify-center h-full text-green-200/50">
            <div className="text-center">
              <Euro className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Δεν υπάρχουν δαπάνες για τον τρέχοντα μήνα</p>
            </div>
          </div>
        ) : (
          topExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm rounded-lg border border-green-500/20 p-2.5 hover:border-green-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {expense.title || expense.description || 'Δαπάνη'}
                  </p>
                  {expense.category && (
                    <p className="text-xs text-green-300/70 mt-0.5">
                      {expense.category}
                    </p>
                  )}
                </div>
                <div className="ml-3 text-right">
                  <p className="text-sm font-bold text-green-300">
                    €{parseFloat(expense.amount || 0).toFixed(2)}
                  </p>
                  {expense.date && (
                    <p className="text-xs text-green-200/50">
                      {format(new Date(expense.date), 'dd/MM', { locale: el })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

