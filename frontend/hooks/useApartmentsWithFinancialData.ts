import { useState, useCallback, useEffect, useRef } from 'react';
import { api, fetchApartmentsWithFinancialData } from '@/lib/api';

export interface ApartmentWithFinancialData {
  id: number;
  number: string;
  owner_name?: string;
  tenant_name?: string;
  current_balance?: number;
  monthly_due?: number;
  building_id?: number;
  building_name?: string;
  participation_mills?: number;
  latest_payment_date?: string;
  latest_payment_amount?: number;
}

export const useApartmentsWithFinancialData = (buildingId?: number) => {
  const [apartments, setApartments] = useState<ApartmentWithFinancialData[]>([]);
  const [building, setBuilding] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestTimeRef = useRef<number>(0);

  // Load apartments with financial data (optimized for rate limiting with debouncing)
  const loadApartments = useCallback(async () => {
    if (!buildingId) return;
    
    // Debouncing: prevent rapid successive calls
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    const MIN_INTERVAL = 1000; // Minimum 1 second between requests
    
    if (timeSinceLastRequest < MIN_INTERVAL) {
      console.log('Request debounced, too soon since last request');
      return;
    }
    
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    lastRequestTimeRef.current = now;
    setIsLoading(true);
    setError(null);
    
    try {
      // Get building data first
      const buildingResponse = await api.get(`/buildings/list/${buildingId}/`);
      setBuilding(buildingResponse.data);
      
      // Use the optimized batch API function
      const apartmentsWithFinancialData = await fetchApartmentsWithFinancialData(buildingId);
      
      setApartments(apartmentsWithFinancialData as ApartmentWithFinancialData[]);
    } catch (err: any) {
      console.error('Error loading apartments with financial data:', err);
      
      // Provide more specific error messages for rate limiting
      if (err.response?.status === 429) {
        setError('Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε λίγο και δοκιμάστε ξανά.');
      } else {
        setError('Σφάλμα κατά τη φόρτωση των διαμερισμάτων');
      }
      
      setApartments([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  // Load apartments when buildingId changes
  useEffect(() => {
    if (buildingId) {
      loadApartments();
    }
  }, [buildingId, loadApartments]);

  // Alternative approach: Get apartments with financial summary in one call
  const loadApartmentsWithSummary = useCallback(async () => {
    if (!buildingId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get building data first
      const buildingResponse = await api.get(`/buildings/list/${buildingId}/`);
      setBuilding(buildingResponse.data);
      
      // Use the optimized batch API function (same as loadApartments now)
      const apartmentsWithFinancialData = await fetchApartmentsWithFinancialData(buildingId);
      
      setApartments(apartmentsWithFinancialData as ApartmentWithFinancialData[]);
    } catch (err: any) {
      console.error('Error loading apartments with financial summary:', err);
      
      // Provide more specific error messages for rate limiting
      if (err.response?.status === 429) {
        setError('Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε λίγο και δοκιμάστε ξανά.');
      } else {
        setError('Σφάλμα κατά τη φόρτωση των διαμερισμάτων');
      }
      
      setApartments([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    apartments,
    building,
    isLoading,
    error,
    loadApartments,
    loadApartmentsWithSummary,
    clearError: () => setError(null),
  };
};

