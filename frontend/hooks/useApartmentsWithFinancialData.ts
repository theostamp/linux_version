import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load apartments with financial data
  const loadApartments = useCallback(async () => {
    if (!buildingId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First, get all apartments for the building
      const apartmentsResponse = await api.get(`/apartments/?building=${buildingId}`);
      const allApartments = apartmentsResponse.data.results || apartmentsResponse.data;

      // Then get financial data for each apartment
      const apartmentsWithFinancialData = await Promise.all(
        allApartments.map(async (apartment: any) => {
          try {
            // Get the latest payment data for this apartment
            const paymentsResponse = await api.get(`/financial/payments/?building_id=${buildingId}&apartment_id=${apartment.id}`);
            const payments = paymentsResponse.data.results || paymentsResponse.data || [];
            
            // Get the latest payment if any
            const latestPayment = payments.length > 0 ? payments[0] : null;
            
            return {
              id: apartment.id,
              number: apartment.number,
              owner_name: apartment.owner_name || latestPayment?.owner_name,
              tenant_name: apartment.tenant_name || latestPayment?.tenant_name,
              current_balance: latestPayment?.current_balance || 0,
              monthly_due: latestPayment?.monthly_due || 0,
              building_id: apartment.building,
              building_name: apartment.building_name,
              participation_mills: apartment.participation_mills,
              latest_payment_date: latestPayment?.date,
              latest_payment_amount: latestPayment?.amount,
            } as ApartmentWithFinancialData;
          } catch (err) {
            // If we can't get financial data for this apartment, just return basic info
            return {
              id: apartment.id,
              number: apartment.number,
              owner_name: apartment.owner_name,
              tenant_name: apartment.tenant_name,
              current_balance: 0,
              monthly_due: 0,
              building_id: apartment.building,
              building_name: apartment.building_name,
              participation_mills: apartment.participation_mills,
            } as ApartmentWithFinancialData;
          }
        })
      );

      setApartments(apartmentsWithFinancialData);
    } catch (err: any) {
      console.error('Error loading apartments with financial data:', err);
      setError('Σφάλμα κατά τη φόρτωση των διαμερισμάτων');
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
      // Use a more efficient approach - get apartments and their financial summary
      const response = await api.get(`/financial/building/${buildingId}/apartments-summary/`);
      const data = response.data.results || response.data || [];
      
      setApartments(data);
    } catch (err: any) {
      // Fallback to the original approach if the summary endpoint doesn't exist
      console.warn('Summary endpoint not available, falling back to individual calls');
      await loadApartments();
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, loadApartments]);

  return {
    apartments,
    isLoading,
    error,
    loadApartments,
    loadApartmentsWithSummary,
    clearError: () => setError(null),
  };
};
