import { useState, useCallback } from 'react';
import { Expense, ExpenseFormData, ExpenseFilters, ApiResponse } from '@/types/financial';

// API base URL - θα πρέπει να ρυθμιστεί ανάλογα με το environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const useExpenses = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      if (data.attachment) {
        formData.append('attachment', data.attachment);
      }

      const response = await fetch(`${API_BASE_URL}/financial/expenses/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη δημιουργία της δαπάνης');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη δαπανών
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

      const response = await fetch(`${API_BASE_URL}/financial/expenses/?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη λήψη των δαπανών');
      }

      const result = await response.json();
      return result.results || result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
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
      const response = await fetch(`${API_BASE_URL}/financial/expenses/pending/?building_id=${buildingId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη λήψη των ανέκδοτων δαπανών');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη εκδοθεισών δαπανών
  const getIssuedExpenses = useCallback(async (buildingId: number): Promise<Expense[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/financial/expenses/issued/?building_id=${buildingId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη λήψη των εκδοθεισών δαπανών');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
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
      
      // Προσθήκη πεδίων που έχουν αλλάξει
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`${API_BASE_URL}/financial/expenses/${id}/`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά την ενημέρωση της δαπάνης');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Διαγραφή δαπάνης
  const deleteExpense = useCallback(async (id: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/financial/expenses/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη διαγραφή της δαπάνης');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη κατηγοριών δαπανών
  const getExpenseCategories = useCallback(async (): Promise<Array<{value: string, label: string}>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/financial/expenses/categories/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα κατά τη λήψη των κατηγοριών');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error fetching expense categories:', err);
      return [];
    }
  }, []);

  // Λήψη τρόπων κατανομής
  const getDistributionTypes = useCallback(async (): Promise<Array<{value: string, label: string}>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/financial/expenses/distribution_types/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα κατά τη λήψη των τρόπων κατανομής');
      }

      const result = await response.json();
      return result;
    } catch (err) {
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
  };
}; 