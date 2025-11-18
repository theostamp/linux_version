import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Expense } from '@/types/financial';
import { parseAmount } from '@/lib/utils';

interface ExpenseParams {
  building?: number;
  building_id?: number;
  date__gte?: string;
  date__lte?: string;
  expense_date_after?: string;
  expense_date_before?: string;
  expense_type?: string;
  category?: string;
  month?: string;
  page_size?: number;
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

      const buildingParam = params.building ?? params.building_id;
      if (buildingParam) {
        queryParams.append('building', buildingParam.toString());
      } else {
        console.warn('[useExpensesQuery] Missing building parameter. Results may not be filtered correctly.');
      }

      const dateGte = params.date__gte ?? params.expense_date_after;
      if (dateGte) {
        queryParams.append('date__gte', dateGte);
      }

      const dateLte = params.date__lte ?? params.expense_date_before;
      if (dateLte) {
        queryParams.append('date__lte', dateLte);
      }

      if (params.expense_type) queryParams.append('expense_type', params.expense_type);
      if (params.category) queryParams.append('category', params.category);
      if (params.month) queryParams.append('month', params.month);
      const pageSize = params.page_size ?? 500;
      queryParams.append('page_size', pageSize.toString());

      // The api.get returns data directly, not response.data
      const response = await api.get<{ results?: Expense[] } | Expense[]>(`/financial/expenses/?${queryParams.toString()}`);
      
      // Handle both paginated and non-paginated responses
      const data = (response as { results?: Expense[] }).results || (response as Expense[]);

      const normalize = (e: any): Expense => ({
        ...e,
        amount: parseAmount(e?.amount),
      });

      return Array.isArray(data) ? data.map(normalize) : [];
    },
    enabled: options?.enabled !== false && !!params.building_id,
  });
};

