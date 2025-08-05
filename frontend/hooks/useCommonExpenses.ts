import { useState, useCallback } from 'react';
import { 
  CommonExpensePeriod, 
  ApartmentShare, 
  CommonExpenseCalculationRequest,
  CommonExpenseCalculationResult,
  CommonExpenseIssueRequest,
  MeterReading 
} from '@/types/financial';
import { api } from '@/lib/api';

export const useCommonExpenses = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCommonExpensePeriods = useCallback(async (buildingId?: number): Promise<CommonExpensePeriod[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      if (buildingId) searchParams.append('building_id', buildingId.toString());

      const response = await api.get(`/financial/common-expense-periods/?${searchParams}`);

      const result = response.data;
      return Array.isArray(result) ? result : result.results || [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη φόρτωση περιόδων κοινοχρήστων';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCommonExpensePeriod = useCallback(async (data: {
    building: number;
    period_name: string;
    start_date: string;
    end_date: string;
  }): Promise<CommonExpensePeriod> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/financial/common-expense-periods/', data);

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη δημιουργία περιόδου κοινοχρήστων';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateCommonExpenses = useCallback(async (data: CommonExpenseCalculationRequest): Promise<CommonExpenseCalculationResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/financial/common-expenses/calculate/', data);

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τον υπολογισμό κοινοχρήστων';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const issueCommonExpenses = useCallback(async (data: CommonExpenseIssueRequest): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/financial/common-expenses/issue/', data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την έκδοση κοινοχρήστων';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Automation methods
  const createPeriodAutomatically = useCallback(async (data: {
    building_id: number;
    period_type: 'monthly' | 'quarterly' | 'semester' | 'yearly';
    start_date?: string;
  }): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/financial/common-expenses/create_period_automatically/', data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη δημιουργία περιόδου';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const collectExpensesAutomatically = useCallback(async (data: {
    building_id: number;
    period_id: number;
  }): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/financial/common-expenses/collect_expenses_automatically/', data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη συλλογή δαπανών';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateAutomatically = useCallback(async (data: {
    building_id: number;
    period_id: number;
  }): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/financial/common-expenses/calculate_automatically/', data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τον υπολογισμό';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const issueAutomatically = useCallback(async (data: {
    building_id: number;
    period_id: number;
  }): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/financial/common-expenses/issue_automatically/', data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την έκδοση';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const autoProcessPeriod = useCallback(async (data: {
    building_id: number;
    period_type: 'monthly' | 'quarterly' | 'semester' | 'yearly';
    start_date?: string;
  }): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/financial/common-expenses/auto_process_period/', data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την αυτοματοποιημένη επεξεργασία';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPeriodStatistics = useCallback(async (building_id: number, period_id: number): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/financial/common-expenses/period_statistics/?building_id=${building_id}&period_id=${period_id}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη στατιστικών';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPeriodTemplates = useCallback(async (): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/financial/common-expenses/period_templates/');
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη templates';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getApartmentShares = useCallback(async (periodId?: number, buildingId?: number): Promise<ApartmentShare[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      if (periodId) searchParams.append('period', periodId.toString());
      if (buildingId) searchParams.append('building_id', buildingId.toString());

      const response = await api.get(`/financial/apartment-shares/?${searchParams}`);

      const result = response.data;
      return Array.isArray(result) ? result : result.results || [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη φόρτωση μεριδίων διαμερισμάτων';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createMeterReading = useCallback(async (data: {
    apartment: number;
    reading_date: string;
    value: number;
    meter_type: string;
  }): Promise<MeterReading> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/financial/meter-readings/', data);

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη δημιουργία μέτρησης';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMeterReadings = useCallback(async (buildingId?: number, apartmentId?: number, meterType?: string): Promise<MeterReading[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      if (buildingId) searchParams.append('building_id', buildingId.toString());
      if (apartmentId) searchParams.append('apartment', apartmentId.toString());
      if (meterType) searchParams.append('meter_type', meterType);

      const response = await api.get(`/financial/meter-readings/?${searchParams}`);

      const result = response.data;
      return Array.isArray(result) ? result : result.results || [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη φόρτωση μετρήσεων';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    getCommonExpensePeriods,
    createCommonExpensePeriod,
    calculateCommonExpenses,
    // Backward-compat alias for older components
    calculateShares: calculateCommonExpenses,
    issueCommonExpenses,
    getApartmentShares,
    createMeterReading,
    getMeterReadings,
    isLoading,
    error,
    clearError,
    // Automation methods
    createPeriodAutomatically,
    collectExpensesAutomatically,
    calculateAutomatically,
    issueAutomatically,
    autoProcessPeriod,
    getPeriodStatistics,
    getPeriodTemplates,
  };
}; 