import { useState, useCallback } from 'react';
import { Payment, PaymentFormData, PaymentFilters } from '@/types/financial';

// API base URL - θα πρέπει να ρυθμιστεί ανάλογα με το environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const usePayments = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Δημιουργία νέας πληρωμής
  const createPayment = useCallback(async (data: PaymentFormData): Promise<Payment | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Προσθήκη βασικών πεδίων
      formData.append('apartment_id', data.apartment_id.toString());
      formData.append('amount', data.amount.toString());
      formData.append('date', data.date);
      formData.append('method', data.method);
      
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      if (data.receipt) {
        formData.append('receipt', data.receipt);
      }

      const response = await fetch(`${API_BASE_URL}/financial/payments/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη δημιουργία της πληρωμής');
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

  // Επεξεργασία πληρωμής (με ενημέρωση υπολοίπων)
  const processPayment = useCallback(async (data: PaymentFormData): Promise<{success: boolean, transaction_id?: number}> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Προσθήκη βασικών πεδίων
      formData.append('apartment_id', data.apartment_id.toString());
      formData.append('amount', data.amount.toString());
      formData.append('date', data.date);
      formData.append('method', data.method);
      
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      if (data.receipt) {
        formData.append('receipt', data.receipt);
      }

      const response = await fetch(`${API_BASE_URL}/financial/payments/process_payment/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά την επεξεργασία της πληρωμής');
      }

      const result = await response.json();
      return {
        success: true,
        transaction_id: result.transaction_id
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη πληρωμών
  const getPayments = useCallback(async (filters: PaymentFilters = {}): Promise<Payment[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filters.building_id) {
        params.append('building_id', filters.building_id.toString());
      }
      if (filters.apartment_id) {
        params.append('apartment_id', filters.apartment_id.toString());
      }
      if (filters.method) {
        params.append('method', filters.method);
      }
      if (filters.date_from) {
        params.append('date__gte', filters.date_from);
      }
      if (filters.date_to) {
        params.append('date__lte', filters.date_to);
      }

      const response = await fetch(`${API_BASE_URL}/financial/payments/?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη λήψη των πληρωμών');
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

  // Λήψη πληρωμών ανά διαμέρισμα
  const getPaymentsByApartment = useCallback(async (apartmentId: number): Promise<Payment[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/financial/payments/?apartment_id=${apartmentId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη λήψη των πληρωμών του διαμερίσματος');
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

  // Ενημέρωση πληρωμής
  const updatePayment = useCallback(async (id: number, data: Partial<PaymentFormData>): Promise<Payment | null> => {
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

      const response = await fetch(`${API_BASE_URL}/financial/payments/${id}/`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά την ενημέρωση της πληρωμής');
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

  // Διαγραφή πληρωμής
  const deletePayment = useCallback(async (id: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/financial/payments/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά τη διαγραφή της πληρωμής');
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

  // Λήψη τρόπων πληρωμής
  const getPaymentMethods = useCallback(async (): Promise<Array<{value: string, label: string}>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/financial/payments/methods/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα κατά τη λήψη των τρόπων πληρωμής');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error fetching payment methods:', err);
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
    createPayment,
    processPayment,
    getPayments,
    getPaymentsByApartment,
    updatePayment,
    deletePayment,
    getPaymentMethods,
    clearError,
  };
}; 