import { useState, useCallback, useEffect, useRef } from 'react';
import { api, fetchApartmentsWithFinancialData } from '@/lib/api';

export interface ApartmentWithFinancialData {
  id: number;
  number: string;
  owner_name: string;
  tenant_name: string;
  participation_mills?: number;
  heating_mills?: number;
  elevator_mills?: number;
  current_balance: number;
  monthly_due: number;
  last_payment_date?: string;
  latest_payment_amount?: number;
}

export const useApartmentsWithFinancialData = (buildingId?: number, month?: string) => {
  const [apartments, setApartments] = useState<ApartmentWithFinancialData[]>([]);
  const [building, setBuilding] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const currentRequestRef = useRef<string>(''); // Track current request to prevent stale responses

  // Load apartments with financial data (optimized for rate limiting with debouncing)
  const loadApartments = useCallback(async () => {
    if (!buildingId) return;
    
    // Create request identifier to prevent stale responses
    const requestId = `${buildingId}-${month || 'current'}-${Date.now()}`;
    currentRequestRef.current = requestId;
    
    // Debouncing: prevent rapid successive calls
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    const MIN_INTERVAL = 500; // Reduced to 500ms for better responsiveness
    
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
    
    console.log(`🔄 Loading apartments for building ${buildingId}, month: ${month || 'current'}`);
    
    try {
      // Get building data first
      const buildingResponse = await api.get(`/buildings/list/${buildingId}/`);
      
      // Check if this request is still the current one
      if (currentRequestRef.current !== requestId) {
        console.log('Request cancelled, newer request in progress');
        return;
      }
      
      setBuilding(buildingResponse.data);
      
      // Use the optimized batch API function
      const apartmentsWithFinancialData = await fetchApartmentsWithFinancialData(buildingId, month);
      
      // Final check before updating state
      if (currentRequestRef.current === requestId) {
        setApartments(apartmentsWithFinancialData as ApartmentWithFinancialData[]);
        console.log(`✅ Apartments loaded successfully for ${month || 'current'}: ${apartmentsWithFinancialData.length} apartments`);
      } else {
        console.log('Response discarded, newer request completed');
      }
    } catch (err: any) {
      console.error('Error loading apartments with financial data:', err);
      
      // Only update error state if this is still the current request
      if (currentRequestRef.current === requestId) {
        // Provide more specific error messages for rate limiting
        if (err.response?.status === 429) {
          setError('Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε λίγο και δοκιμάστε ξανά.');
        } else {
          setError('Σφάλμα κατά τη φόρτωση των διαμερισμάτων');
        }
        
        setApartments([]);
      }
    } finally {
      // Only stop loading if this is still the current request
      if (currentRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [buildingId, month]);

  // Load apartments when buildingId changes
  useEffect(() => {
    if (buildingId) {
      loadApartments();
    }
  }, [buildingId, month, loadApartments]);

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
      const apartmentsWithFinancialData = await fetchApartmentsWithFinancialData(buildingId, month);
      
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
  }, [buildingId, month]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Force refresh function that bypasses debouncing
  const forceRefresh = useCallback(async () => {
    if (!buildingId) return;
    
    // Reset debouncing timer to allow immediate refresh
    lastRequestTimeRef.current = 0;
    
    // Clear apartments to show loading state
    setApartments([]);
    
    // Trigger immediate load
    await loadApartments();
  }, [buildingId, loadApartments]);

  return {
    apartments,
    building,
    isLoading,
    error,
    loadApartments,
    loadApartmentsWithSummary,
    forceRefresh,
    clearError: () => setError(null),
  };
};

