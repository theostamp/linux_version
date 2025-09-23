import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Expense } from '@/types/financial';
import { parseAmount } from '@/lib/utils';

interface ExpenseParams {
  building_id?: number;
  expense_date_after?: string;
  expense_date_before?: string;
  expense_type?: string;
  month?: string;
}

export const useExpenses = (
  params: ExpenseParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      if (!params.building_id) {
        return [];
      }

      const queryParams = new URLSearchParams();

      if (params.building_id) queryParams.append('building_id', params.building_id.toString());
      if (params.expense_date_after) queryParams.append('expense_date_after', params.expense_date_after);
      if (params.expense_date_before) queryParams.append('expense_date_before', params.expense_date_before);
      if (params.expense_type) queryParams.append('expense_type', params.expense_type);
      if (params.month) queryParams.append('month', params.month);

      const response = await api.get(`/financial/expenses/?${queryParams.toString()}`);
      const data = response.data.results || response.data;

      const normalize = (e: any): Expense => ({
        ...e,
        amount: parseAmount(e?.amount),
      });

      return Array.isArray(data) ? data.map(normalize) : [];
    },
    enabled: options?.enabled !== false && !!params.building_id,
  });
};