'use client';

import { useState, useCallback } from 'react';
import { FinancialSummary, ApartmentBalance, Transaction } from '@/types/financial';
import { apiGet } from '@/lib/api';

export const useFinancialDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNotFoundError = (err: unknown) => {
    const e = err as { status?: number; response?: { status?: number } };
    return e?.status === 404 || e?.response?.status === 404;
  };

  // Λήψη σύνοψης οικονομικών στοιχείων
  const getFinancialSummary = useCallback(async (buildingId: number): Promise<FinancialSummary | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<FinancialSummary>(`/financial/dashboard/summary/`, { building_id: buildingId });
      return data;
    } catch (err: unknown) {
      if (!isNotFoundError(err)) {
        const error = err as { message?: string };
        const errorMessage = error.message || 'Σφάλμα κατά τη λήψη της οικονομικής σύνοψης';
        setError(errorMessage);
      }
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
      const data = await apiGet<{ apartments?: ApartmentBalance[] } | ApartmentBalance[]>(`/financial/dashboard/apartment_balances/`, { building_id: buildingId });
      // Handle both object with apartments property and direct array
      const result = Array.isArray(data) ? data : (data as { apartments?: ApartmentBalance[] }).apartments || [];
      return result;
    } catch (err: unknown) {
      if (!isNotFoundError(err)) {
        const error = err as { message?: string };
        const errorMessage = error.message || 'Σφάλμα κατά τη λήψη των οφειλών διαμερισμάτων';
        setError(errorMessage);
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη πρόσφατων συναλλαγών
  const getRecentTransactions = useCallback(async (buildingId: number, limit: number = 10): Promise<Transaction[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<Transaction[]>(`/financial/dashboard/recent-transactions/`, { building_id: buildingId, limit });
      return data;
    } catch (err: unknown) {
      if (!isNotFoundError(err)) {
        const error = err as { message?: string };
        const errorMessage = error.message || 'Σφάλμα κατά τη λήψη των πρόσφατων συναλλαγών';
        setError(errorMessage);
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη στατιστικών πληρωμών
  const getPaymentStatistics = useCallback(async (buildingId: number, period: string = 'month'): Promise<unknown> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<unknown>(`/financial/dashboard/payment-statistics/`, { building_id: buildingId, period });
      return data;
    } catch (err: unknown) {
      if (!isNotFoundError(err)) {
        const error = err as { message?: string };
        const errorMessage = error.message || 'Σφάλμα κατά τη λήψη των στατιστικών πληρωμών';
        setError(errorMessage);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη γραφήματος εσόδων
  const getRevenueChart = useCallback(async (buildingId: number, period: string = 'year'): Promise<unknown> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<unknown>(`/financial/dashboard/revenue-chart/`, { building_id: buildingId, period });
      return data;
    } catch (err: unknown) {
      if (!isNotFoundError(err)) {
        const error = err as { message?: string };
        const errorMessage = error.message || 'Σφάλμα κατά τη λήψη του γραφήματος εσόδων';
        setError(errorMessage);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη γραφήματος εξόδων
  const getExpenseChart = useCallback(async (buildingId: number, period: string = 'year'): Promise<unknown> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<unknown>(`/financial/dashboard/expense-chart/`, { building_id: buildingId, period });
      return data;
    } catch (err: unknown) {
      if (!isNotFoundError(err)) {
        const error = err as { message?: string };
        const errorMessage = error.message || 'Σφάλμα κατά τη λήψη του γραφήματος εξόδων';
        setError(errorMessage);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη αναφοράς οφειλών
  const getDebtReport = useCallback(async (buildingId: number): Promise<unknown> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<unknown>(`/financial/dashboard/debt-report/`, { building_id: buildingId });
      return data;
    } catch (err: unknown) {
      if (!isNotFoundError(err)) {
        const error = err as { message?: string };
        const errorMessage = error.message || 'Σφάλμα κατά τη λήψη της αναφοράς οφειλών';
        setError(errorMessage);
      }
      return null;
    } finally {
      setIsLoading(false);
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
    getFinancialSummary,
    getApartmentBalances,
    getRecentTransactions,
    getPaymentStatistics,
    getRevenueChart,
    getExpenseChart,
    getDebtReport,
    clearError,
  };
};

