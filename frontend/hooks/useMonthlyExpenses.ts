import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface ExpenseBreakdownItem {
  category: string;
  category_display: string;
  amount: number;
  payer_responsibility?: 'owner' | 'resident' | 'shared';  // ✅ ΝΕΟ ΠΕΔΙΟ
}

export interface MonthlyExpenses {
  total_expenses_month: number;
  management_fee_per_apartment: number;  // Changed from management_fees
  total_management_cost: number;         // Added this field
  reserve_fund_contribution: number;
  previous_month_expenses: number;
  previous_month_name: string;
  current_month_name: string;
  invoice_total: number;
  current_invoice: number;
  previous_balances: number;
  grand_total: number;
  current_invoice_paid: number;
  current_invoice_total: number;
  current_invoice_coverage_percentage: number;
  total_paid: number;
  total_obligations: number;
  total_coverage_percentage: number;
  current_reserve: number;
  reserve_target: number;
  reserve_monthly_contribution: number;
  reserve_progress_percentage: number;
  apartment_count: number;
  has_monthly_activity: boolean;
  expense_breakdown?: ExpenseBreakdownItem[];  // ← ΝΕΟ FIELD
}

export const useMonthlyExpenses = (buildingId?: number, month?: string) => {
  const [expenses, setExpenses] = useState<MonthlyExpenses | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlyExpenses = useCallback(async () => {
    if (!buildingId) {
      console.log('⚠️ No buildingId provided, skipping fetchMonthlyExpenses');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔄 Fetching monthly expenses for building ${buildingId}, month: ${month}`);
      
      const params = new URLSearchParams();
      params.append('building_id', buildingId.toString());
      if (month) {
        params.append('month', month);
      }

      const response = await api.get(`/financial/dashboard/summary/?${params.toString()}`);
      
      console.log('🔍 DEBUG Monthly expenses API response:', {
        url: `/financial/dashboard/summary/?${params.toString()}`,
        status: response.status,
        data: response.data,
        hasData: !!response.data,
        keys: response.data ? Object.keys(response.data) : 'No data',
        hasExpenseBreakdown: !!response.data?.expense_breakdown,
        expenseBreakdownLength: response.data?.expense_breakdown?.length,
        expenseBreakdownData: response.data?.expense_breakdown,
        managementFields: response.data ? {
          management_fee_per_apartment: response.data.management_fee_per_apartment,
          total_management_cost: response.data.total_management_cost,
          total_expenses_month: response.data.total_expenses_month
        } : 'No data'
      });
      
      setExpenses(response.data);
    } catch (err: any) {
      console.error('Error fetching monthly expenses:', err);
      setError('Σφάλμα κατά τη φόρτωση των μηνιαίων δαπανών');
      setExpenses(null);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, month]);

  // Fetch expenses when buildingId or month changes
  useEffect(() => {
    fetchMonthlyExpenses();
  }, [fetchMonthlyExpenses]);

  // Force refresh function
  const forceRefresh = useCallback(() => {
    fetchMonthlyExpenses();
  }, [fetchMonthlyExpenses]);

  return {
    expenses,
    isLoading,
    error,
    forceRefresh,
    clearError: () => setError(null),
  };
};
