import { useState, useCallback } from 'react';
import { FinancialSummary, ApartmentBalance, Transaction } from '@/types/financial';

// API base URL - θα πρέπει να ρυθμιστεί ανάλογα με το environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const useFinancialDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Λήψη σύνοψης οικονομικών στοιχείων
  const getFinancialSummary = useCallback(async (buildingId: number): Promise<FinancialSummary | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/financial/dashboard/summary/?building_id=${buildingId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη λήψη της οικονομικής σύνοψης');
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

  // Λήψη κατάστασης οφειλών διαμερισμάτων
  const getApartmentBalances = useCallback(async (buildingId: number): Promise<ApartmentBalance[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/financial/dashboard/apartment_balances/?building_id=${buildingId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη λήψη της κατάστασης οφειλών');
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

  // Λήψη πρόσφατων κινήσεων
  const getRecentTransactions = useCallback(async (buildingId: number, limit: number = 10): Promise<Transaction[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/financial/transactions/recent/?building_id=${buildingId}&limit=${limit}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη λήψη των πρόσφατων κινήσεων');
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

  // Λήψη κινήσεων με φίλτρα
  const getTransactions = useCallback(async (buildingId: number, filters: {
    type?: string;
    date_from?: string;
    date_to?: string;
    apartment_number?: string;
  } = {}): Promise<Transaction[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('building_id', buildingId.toString());
      
      if (filters.type) {
        params.append('type', filters.type);
      }
      if (filters.date_from) {
        params.append('date__gte', filters.date_from);
      }
      if (filters.date_to) {
        params.append('date__lte', filters.date_to);
      }
      if (filters.apartment_number) {
        params.append('apartment_number', filters.apartment_number);
      }

      const response = await fetch(`${API_BASE_URL}/financial/transactions/?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη λήψη των κινήσεων');
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

  // Λήψη τύπων κινήσεων
  const getTransactionTypes = useCallback(async (): Promise<Array<{value: string, label: string}>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/financial/transactions/types/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα κατά τη λήψη των τύπων κινήσεων');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error fetching transaction types:', err);
      return [];
    }
  }, []);

  // Υπολογισμός στατιστικών
  const calculateStatistics = useCallback((transactions: Transaction[]) => {
    const totalIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const netBalance = totalIncome - totalExpenses;
    
    // Ομαδοποίηση ανά μήνα
    const monthlyData = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { income: 0, expenses: 0, balance: 0 };
      }
      
      if (transaction.amount > 0) {
        acc[monthKey].income += transaction.amount;
      } else {
        acc[monthKey].expenses += Math.abs(transaction.amount);
      }
      
      acc[monthKey].balance = acc[monthKey].income - acc[monthKey].expenses;
      
      return acc;
    }, {} as Record<string, { income: number; expenses: number; balance: number }>);
    
    return {
      totalIncome,
      totalExpenses,
      netBalance,
      monthlyData,
      transactionCount: transactions.length
    };
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
    getFinancialSummary,
    getApartmentBalances,
    getRecentTransactions,
    getTransactions,
    getTransactionTypes,
    calculateStatistics,
    clearError,
  };
}; 