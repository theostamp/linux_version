import { useState, useCallback, useEffect, useRef } from 'react';
import { api, fetchApartmentsWithFinancialData } from '@/lib/api';

export interface ApartmentWithFinancialData {
  id: number;
  number: string;
  apartment_number?: string;  // Alias for number field
  owner_name: string;
  tenant_name: string;
  participation_mills?: number;
  heating_mills?: number;
  elevator_mills?: number;
  current_balance: number;
  previous_balance?: number;
  monthly_due: number;
  last_payment_date?: string;
  latest_payment_amount?: number;
  // Additional fields that might be returned by the API
  expense_share?: number;
  net_obligation?: number;
  total_obligations?: number;
  total_payments?: number;
}

export const useApartmentsWithFinancialData = (buildingId?: number, month?: string) => {
  const [apartments, setApartments] = useState<ApartmentWithFinancialData[]>([]);
  const [building, setBuilding] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const currentRequestRef = useRef<string>(''); // Track current request to prevent stale responses

  // Load apartments with financial data (optimized for rate limiting)
  const loadApartments = useCallback(async () => {
    if (!buildingId) {
      console.log('⚠️ No buildingId provided, skipping loadApartments');
      return;
    }
    
    // Create request identifier to prevent stale responses
    const requestId = `${buildingId}-${month || 'current'}-${Date.now()}`;
    currentRequestRef.current = requestId;
    
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    setIsLoading(true);
    setError(null);
    
    console.log(`🔄 Loading apartments for building ${buildingId}, month: ${month}`);
    
    try {
      // Get building data first
      console.log('🔍 DEBUG calling building API...');
      // The api.get returns data directly
      const buildingResponse = await api.get(`/buildings/list/${buildingId}/`);
      // The api.get returns data directly, not response.data
      console.log('🔍 DEBUG building API response:', buildingResponse);
      
      // Check if this request is still the current one
      if (currentRequestRef.current !== requestId) {
        console.log('Request cancelled, newer request in progress');
        return;
      }
      
      setBuilding(buildingResponse);
      
      // Use the optimized batch API function
      console.log('🔍 DEBUG calling fetchApartmentsWithFinancialData...');
      const apartmentsWithFinancialData = await fetchApartmentsWithFinancialData(buildingId, month);
      
      // DEBUG: Log what we got from fetchApartmentsWithFinancialData
      console.log('🔍 DEBUG fetchApartmentsWithFinancialData result:', {
        buildingId,
        month,
        resultType: typeof apartmentsWithFinancialData,
        isArray: Array.isArray(apartmentsWithFinancialData),
        length: Array.isArray(apartmentsWithFinancialData) ? apartmentsWithFinancialData.length : 'N/A',
        sampleData: Array.isArray(apartmentsWithFinancialData) && apartmentsWithFinancialData.length > 0 ? apartmentsWithFinancialData[0] : 'No data'
      });
      
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
    console.log('🔍 DEBUG useEffect triggered:', { buildingId, month, hasBuildingId: !!buildingId });
    if (buildingId) {
      console.log('🔍 DEBUG calling loadApartments for buildingId:', buildingId, 'month:', month);
      loadApartments();
    } else {
      console.log('⚠️ No buildingId in useEffect, skipping loadApartments');
    }
  }, [buildingId, month, loadApartments]);

  // Alternative approach: Get apartments with financial summary in one call
  const loadApartmentsWithSummary = useCallback(async () => {
    if (!buildingId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get building data first
      // The api.get returns data directly
      const buildingResponse = await api.get(`/buildings/list/${buildingId}/`);
      // The api.get returns data directly
      setBuilding(buildingResponse);
      
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
    
    // NOTE: Don't clear apartments here - keep showing old data while loading new data
    // This prevents flickering where the UI briefly shows empty state
    // The loading indicator (isLoading) can be used to show a subtle refresh indicator
    
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

