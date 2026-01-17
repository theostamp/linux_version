/**
 * Office Finance Hooks
 * Διαχείριση εσόδων/εξόδων γραφείου
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Types
export interface ExpenseCategory {
  id: number;
  name: string;
  group_type: string;
  group_type_display: string;
  category_type: string;
  category_type_display: string;
  icon: string;
  color: string;
  description: string;
  display_order: number;
  is_active: boolean;
  is_system: boolean;
}

export interface IncomeCategory {
  id: number;
  name: string;
  group_type: string;
  group_type_display: string;
  category_type: string;
  category_type_display: string;
  icon: string;
  color: string;
  description: string;
  display_order: number;
  links_to_management_expense: boolean;
  is_active: boolean;
  is_system: boolean;
}

// Group types for display
export const EXPENSE_GROUP_LABELS: Record<string, string> = {
  fixed: 'Πάγια Έξοδα',
  operational: 'Λειτουργικά Έξοδα',
  collaborators: 'Συνεργάτες & Εξωτερικοί',
  suppliers: 'Προμηθευτές',
  staff: 'Προσωπικό',
  taxes_legal: 'Φόροι & Νομικά',
  other: 'Λοιπά',
};

export const INCOME_GROUP_LABELS: Record<string, string> = {
  building_fees: 'Αμοιβές Κτιρίων',
  services: 'Υπηρεσίες',
  commissions: 'Προμήθειες',
  product_sales: 'Πωλήσεις Προϊόντων',
  other: 'Λοιπά',
};

export interface OfficeExpense {
  id: number;
  title: string;
  description: string;
  amount: number;
  date: string;
  category: number;
  category_name: string;
  category_type: string;
  payment_method: string;
  payment_method_display: string;
  is_paid: boolean;
  paid_date: string | null;
  recurrence: string;
  recurrence_display: string;
  supplier_name: string;
  supplier_vat: string;
  document: string | null;
  document_number: string;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficeIncome {
  id: number;
  title: string;
  description: string;
  amount: number;
  date: string;
  category: number;
  category_name: string;
  category_type: string;
  building: number | null;
  building_name: string | null;
  status: string;
  status_display: string;
  payment_method: string;
  payment_method_display: string;
  received_date: string | null;
  recurrence: string;
  recurrence_display: string;
  client_name: string;
  client_vat: string;
  document: string | null;
  invoice_number: string;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthSummary {
  year: number;
  month: number;
  income: {
    total: number;
    received: number;
    pending: number;
    count: number;
  };
  expenses: {
    total: number;
    paid: number;
    unpaid: number;
    count: number;
  };
  net_result: number;
}

export interface PreviousMonthSummary {
  year: number;
  month: number;
  income: number;
  expenses: number;
  net_result: number;
}

export interface YearlySummary {
  year: number;
  total_income: number;
  total_expenses: number;
  net_result: number;
  monthly_data: {
    month: number;
    income: number;
    expenses: number;
    net: number;
  }[];
}

export interface IncomeByBuilding {
  building_id: number;
  building_name: string;
  building_address: string;
  total: number;
  count: number;
}

export interface IncomeByCategory {
  category_id: number;
  category_name: string;
  category_type: string;
  group_type: string;
  color: string;
  total: number;
  count: number;
}

export interface ExpensesByCategory {
  category_id: number;
  category_name: string;
  category_type: string;
  color: string;
  total: number;
  count: number;
}

export interface PendingIncome {
  id: number;
  title: string;
  amount: number;
  date: string;
  category_name: string | null;
  building_name: string | null;
  client_name: string;
}

export interface UnpaidExpense {
  id: number;
  title: string;
  amount: number;
  date: string;
  category_name: string | null;
  supplier_name: string;
}

export interface RecentExpense {
  id: number;
  title: string;
  amount: number;
  date: string;
  category_name: string | null;
  is_paid: boolean;
}

export interface RecentIncome {
  id: number;
  title: string;
  amount: number;
  date: string;
  category_name: string | null;
  building_name: string | null;
  status: string;
}

export interface OfficeFinanceDashboard {
  current_month: MonthSummary;
  previous_month: PreviousMonthSummary;
  yearly_summary: YearlySummary;
  income_by_building: IncomeByBuilding[];
  income_by_category: IncomeByCategory[];
  expenses_by_category: ExpensesByCategory[];
  pending_incomes: PendingIncome[];
  unpaid_expenses: UnpaidExpense[];
  recent_expenses: RecentExpense[];
  recent_incomes: RecentIncome[];
  generated_at: string;
}

// Dashboard Hook
export function useOfficeFinanceDashboard() {
  return useQuery<OfficeFinanceDashboard>({
    queryKey: ['office-finance', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/office-finance/dashboard/');
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Expense Categories Hook
export function useExpenseCategories() {
  return useQuery<ExpenseCategory[]>({
    queryKey: ['office-finance', 'expense-categories'],
    queryFn: async () => {
      const response = await api.get('/office-finance/expense-categories/');
      return response.results || response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Income Categories Hook
export function useIncomeCategories() {
  return useQuery<IncomeCategory[]>({
    queryKey: ['office-finance', 'income-categories'],
    queryFn: async () => {
      const response = await api.get('/office-finance/income-categories/');
      return response.results || response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Expenses List Hook
interface UseExpensesParams {
  year?: number;
  month?: number;
  category?: number;
  is_paid?: boolean;
}

export function useOfficeExpenses(params?: UseExpensesParams) {
  const queryParams = new URLSearchParams();
  if (params?.year) queryParams.append('year', params.year.toString());
  if (params?.month) queryParams.append('month', params.month.toString());
  if (params?.category) queryParams.append('category', params.category.toString());
  if (params?.is_paid !== undefined) queryParams.append('is_paid', params.is_paid.toString());

  return useQuery<OfficeExpense[]>({
    queryKey: ['office-finance', 'expenses', params],
    queryFn: async () => {
      const url = queryParams.toString()
        ? `/office-finance/expenses/?${queryParams.toString()}`
        : '/office-finance/expenses/';
      const response = await api.get(url);
      return response.results || response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Incomes List Hook
interface UseIncomesParams {
  year?: number;
  month?: number;
  category?: number;
  building?: number;
  status?: string;
}

export function useOfficeIncomes(params?: UseIncomesParams) {
  const queryParams = new URLSearchParams();
  if (params?.year) queryParams.append('year', params.year.toString());
  if (params?.month) queryParams.append('month', params.month.toString());
  if (params?.category) queryParams.append('category', params.category.toString());
  if (params?.building) queryParams.append('building', params.building.toString());
  if (params?.status) queryParams.append('status', params.status);

  return useQuery<OfficeIncome[]>({
    queryKey: ['office-finance', 'incomes', params],
    queryFn: async () => {
      const url = queryParams.toString()
        ? `/office-finance/incomes/?${queryParams.toString()}`
        : '/office-finance/incomes/';
      const response = await api.get(url);
      return response.results || response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Create Expense Mutation
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<OfficeExpense>) => {
      return await api.post('/office-finance/expenses/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-finance'] });
    },
  });
}

// Update Expense Mutation
export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<OfficeExpense> }) => {
      return await api.patch(`/office-finance/expenses/${id}/`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-finance'] });
    },
  });
}

// Delete Expense Mutation
export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/office-finance/expenses/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-finance'] });
    },
  });
}

// Create Income Mutation
export function useCreateIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<OfficeIncome>) => {
      return await api.post('/office-finance/incomes/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-finance'] });
    },
  });
}

// Update Income Mutation
export function useUpdateIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<OfficeIncome> }) => {
      return await api.patch(`/office-finance/incomes/${id}/`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-finance'] });
    },
  });
}

// Delete Income Mutation
export function useDeleteIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/office-finance/incomes/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-finance'] });
    },
  });
}

// Mark Income as Received Mutation
export function useMarkIncomeReceived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      received_date,
      payment_method
    }: {
      id: number;
      received_date?: string;
      payment_method?: string;
    }) => {
      return await api.post(`/office-finance/incomes/${id}/mark_received/`, {
        received_date,
        payment_method,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-finance'] });
    },
  });
}

// Mark Expense as Paid Mutation
export function useMarkExpensePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      paid_date,
      payment_method
    }: {
      id: number;
      paid_date?: string;
      payment_method?: string;
    }) => {
      return await api.post(`/office-finance/expenses/${id}/mark_paid/`, {
        paid_date,
        payment_method,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-finance'] });
    },
  });
}

// Initialize Default Categories
export function useInitializeCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await api.post('/office-finance/init-categories/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-finance'] });
    },
  });
}

// Yearly Summary Hook
export function useYearlySummary(year?: number) {
  return useQuery<YearlySummary>({
    queryKey: ['office-finance', 'yearly-summary', year],
    queryFn: async () => {
      const url = year
        ? `/office-finance/yearly-summary/?year=${year}`
        : '/office-finance/yearly-summary/';
      return await api.get(url);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export default useOfficeFinanceDashboard;
