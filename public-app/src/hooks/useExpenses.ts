import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Expense, ExpenseFormData, ExpenseFilters, ApiResponse } from '@/types/financial';
import { parseAmount } from '@/lib/utils';
import { api, invalidateApiCache } from '@/lib/api';
import { toast } from 'sonner';

export const useExpenses = (buildingId?: number, selectedMonth?: string) => {
  const queryClient = useQueryClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load expenses when buildingId or selectedMonth changes
  useEffect(() => {
    if (buildingId) {
      loadExpenses();
    }
  }, [buildingId, selectedMonth]);

  // Load expenses for the current building
  const loadExpenses = useCallback(async () => {
    if (!buildingId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString()
      });
      
      // Add selectedMonth parameter if provided
      if (selectedMonth) {
        params.append('month', selectedMonth);
      }
      
      const response = await api.get(`/financial/expenses/?${params}`);
      const data = response.data.results || response.data;
      const normalize = (e: any): Expense => ({
        ...e,
        amount: parseAmount(e?.amount),
      });
      setExpenses(Array.isArray(data) ? data.map(normalize) : []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη των δαπανών';
      setError(errorMessage);
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, selectedMonth]);

  // Δημιουργία νέας δαπάνης
  const createExpense = useCallback(async (data: ExpenseFormData): Promise<Expense | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Προσθήκη βασικών πεδίων
      formData.append('building', data.building.toString());
      formData.append('title', data.title);
      formData.append('amount', data.amount.toString());
      formData.append('date', data.date);
      formData.append('category', data.category);
      formData.append('distribution_type', data.distribution_type);
      
      if (data.supplier) {
        formData.append('supplier', data.supplier.toString());
      }
      
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      if (data.attachment) {
        formData.append('attachment', data.attachment);
      }
      
      if (data.due_date) {
        formData.append('due_date', data.due_date);
      }
      
      if (data.add_to_calendar !== undefined) {
        formData.append('add_to_calendar', data.add_to_calendar.toString());
      }

      const response = await api.post('/financial/expenses/', formData);

      // ✅ Clear API-level cache for financial endpoints (already done by api.post, but ensuring it)
      invalidateApiCache('/api/financial/');
      
      // ✅ Invalidate React Query caches BEFORE refetching to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['financial'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['apartment-balances'] });
      
      // Refresh expenses list after creating new expense
      await loadExpenses();
      
      // ✅ Explicit refetch for components using React Query hooks
      await queryClient.refetchQueries({ queryKey: ['financial'] });
      await queryClient.refetchQueries({ queryKey: ['expenses'] });
      await queryClient.refetchQueries({ queryKey: ['apartment-balances'] });
      
      toast.success('Η δαπάνη δημιουργήθηκε επιτυχώς');
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη δημιουργία της δαπάνης';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadExpenses]);

  // Λήψη δαπανών με φίλτρα
  const getExpenses = useCallback(async (filters: ExpenseFilters = {}): Promise<Expense[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filters.building_id) {
        params.append('building_id', filters.building_id.toString());
      }
      if (filters.category) {
        params.append('category', filters.category);
      }

      if (filters.date_from) {
        params.append('date__gte', filters.date_from);
      }
      if (filters.date_to) {
        params.append('date__lte', filters.date_to);
      }
      if (filters.distribution_type) {
        params.append('distribution_type', filters.distribution_type);
      }

      const response = await api.get(`/financial/expenses/?${params}`);
      const data = response.data.results || response.data;
      const normalize = (e: any): Expense => ({
        ...e,
        amount: parseAmount(e?.amount),
      });
      return Array.isArray(data) ? data.map(normalize) : [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη των δαπανών';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη ανέκδοτων δαπανών - DEPRECATED: Όλες οι δαπάνες θεωρούνται εκδομένες
  const getPendingExpenses = useCallback(async (buildingId: number): Promise<Expense[]> => {
    // Για backwards compatibility, επιστρέφουμε άδεια λίστα
    return [];
  }, []);

  // Λήψη εκδοθέντων δαπανών - Επιστρέφει όλες τις δαπάνες
  const getIssuedExpenses = useCallback(async (buildingId: number): Promise<Expense[]> => {
    // Όλες οι δαπάνες θεωρούνται πλέον εκδομένες
    return getExpenses({ building_id: buildingId });
  }, [getExpenses]);

  // Ενημέρωση δαπάνης
  const updateExpense = useCallback(async (id: number, data: Partial<ExpenseFormData>): Promise<Expense | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Προσθήκη πεδίων που υπάρχουν
      if (data.building !== undefined) {
        formData.append('building', data.building.toString());
      }
      if (data.title) {
        formData.append('title', data.title);
      }
      if (data.amount !== undefined) {
        formData.append('amount', data.amount.toString());
      }
      if (data.date) {
        formData.append('date', data.date);
      }
      if (data.category) {
        formData.append('category', data.category);
      }
      if (data.distribution_type) {
        formData.append('distribution_type', data.distribution_type);
      }
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      if (data.attachment) {
        formData.append('attachment', data.attachment);
      }

      const response = await api.patch(`/financial/expenses/${id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // ✅ Clear API-level cache for financial endpoints (already done by api.patch, but ensuring it)
      invalidateApiCache('/api/financial/');
      
      // ✅ Invalidate React Query caches BEFORE refetching to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['financial'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['apartment-balances'] });
      
      // Refresh expenses list after updating
      await loadExpenses();

      // ✅ Explicit refetch for components using React Query hooks
      await queryClient.refetchQueries({ queryKey: ['financial'] });
      await queryClient.refetchQueries({ queryKey: ['expenses'] });
      await queryClient.refetchQueries({ queryKey: ['apartment-balances'] });

      toast.success('Η δαπάνη ενημερώθηκε επιτυχώς');
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την ενημέρωση της δαπάνης';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadExpenses]);

  // Διαγραφή δαπάνης
  const deleteExpense = useCallback(async (id: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.delete(`/financial/expenses/${id}/`);
      
      // ✅ Clear API-level cache for financial endpoints (already done by api.delete, but ensuring it)
      invalidateApiCache('/api/financial/');
      
      // ✅ Invalidate React Query caches BEFORE refetching to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['financial'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['apartment-balances'] });
      
      // Refresh expenses list after deleting - this will fetch fresh data since cache is cleared
      await loadExpenses();
      
      // ✅ Explicit refetch for components using React Query hooks
      await queryClient.refetchQueries({ queryKey: ['financial'] });
      await queryClient.refetchQueries({ queryKey: ['expenses'] });
      await queryClient.refetchQueries({ queryKey: ['apartment-balances'] });
      
      toast.success('Η δαπάνη διαγράφηκε επιτυχώς');
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη διαγραφή της δαπάνης';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadExpenses, queryClient]);

  // Λήψη κατηγοριών δαπανών
  const getExpenseCategories = useCallback(async (): Promise<Array<{value: string, label: string}>> => {
    try {
      const response = await api.get('/financial/expenses/categories/');
      return response.data;
    } catch (err: any) {
      console.error('Error fetching expense categories:', err);
      return [];
    }
  }, []);

  // Λήψη τρόπων κατανομής
  const getDistributionTypes = useCallback(async (): Promise<Array<{value: string, label: string}>> => {
    try {
      const response = await api.get('/financial/expenses/distribution_types/');
      return response.data;
    } catch (err: any) {
      console.error('Error fetching distribution types:', err);
      return [];
    }
  }, []);

  // Καθαρισμός σφάλματος
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    expenses,
    isLoading,
    error,
    
    // Actions
    createExpense,
    getExpenses,
    getPendingExpenses,
    getIssuedExpenses,
    updateExpense,
    deleteExpense,
    getExpenseCategories,
    getDistributionTypes,
    clearError,
    loadExpenses,
  };
}; 
