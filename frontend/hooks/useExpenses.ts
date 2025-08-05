import { useState, useCallback, useEffect } from 'react';
import { Expense, ExpenseFormData, ExpenseFilters, ApiResponse } from '@/types/financial';
import { api } from '@/lib/api';

export const useExpenses = (buildingId?: number) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load expenses when buildingId changes
  useEffect(() => {
    if (buildingId) {
      loadExpenses();
    }
  }, [buildingId]);

  // Load expenses for the current building
  const loadExpenses = useCallback(async () => {
    if (!buildingId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString()
      });
      
      const response = await api.get(`/financial/expenses/?${params}`);
      const data = response.data.results || response.data;
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη των δαπανών';
      setError(errorMessage);
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

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

      const response = await api.post('/financial/expenses/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refresh expenses list after creating new expense
      await loadExpenses();
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη δημιουργία της δαπάνης';
      setError(errorMessage);
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
      if (filters.is_issued !== undefined) {
        params.append('is_issued', filters.is_issued.toString());
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

      return response.data.results || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη των δαπανών';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη ανέκδοτων δαπανών
  const getPendingExpenses = useCallback(async (buildingId: number): Promise<Expense[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/financial/expenses/pending/?building_id=${buildingId}`);

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη των ανέκδοτων δαπανών';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη εκδοθέντων δαπανών
  const getIssuedExpenses = useCallback(async (buildingId: number): Promise<Expense[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/financial/expenses/issued/?building_id=${buildingId}`);

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη των εκδοθέντων δαπανών';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      // Refresh expenses list after updating
      await loadExpenses();

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την ενημέρωση της δαπάνης';
      setError(errorMessage);
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
      
      // Refresh expenses list after deleting
      await loadExpenses();
      
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη διαγραφή της δαπάνης';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadExpenses]);

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