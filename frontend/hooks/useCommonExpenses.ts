import { useState, useCallback } from 'react';
import { 
  CommonExpensePeriod, 
  ApartmentShare, 
  CommonExpenseCalculationRequest,
  CommonExpenseCalculationResult,
  CommonExpenseIssueRequest,
  MeterReading 
} from '@/types/financial';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const useCommonExpenses = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCommonExpensePeriods = useCallback(async (buildingId?: number): Promise<CommonExpensePeriod[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      if (buildingId) searchParams.append('building_id', buildingId.toString());

      const response = await fetch(`${API_BASE}/financial/common-expense-periods/?${searchParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return Array.isArray(result) ? result : result.results || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση περιόδων κοινοχρήστων';
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
      const response = await fetch(`${API_BASE}/financial/common-expense-periods/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Σφάλμα κατά τη δημιουργία περιόδου κοινοχρήστων';
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
      const response = await fetch(`${API_BASE}/financial/common-expenses/calculate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Σφάλμα κατά τον υπολογισμό κοινοχρήστων';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const issueCommonExpenses = useCallback(async (data: CommonExpenseIssueRequest): Promise<{ message: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/financial/common-expenses/issue/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Σφάλμα κατά την έκδοση κοινοχρήστων';
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

      const response = await fetch(`${API_BASE}/financial/apartment-shares/?${searchParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return Array.isArray(result) ? result : result.results || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση μεριδίων διαμερισμάτων';
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
      const response = await fetch(`${API_BASE}/financial/meter-readings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Σφάλμα κατά τη δημιουργία μέτρησης';
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

      const response = await fetch(`${API_BASE}/financial/meter-readings/?${searchParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return Array.isArray(result) ? result : result.results || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση μετρήσεων';
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
    issueCommonExpenses,
    getApartmentShares,
    createMeterReading,
    getMeterReadings,
    isLoading,
    error,
    clearError,
  };
}; 