import { useState, useCallback, useEffect } from 'react';
import { Payment, PaymentFormData, PaymentFilters } from '@/types/financial';
import { api } from '@/lib/api';

export const usePayments = (buildingId?: number, selectedMonth?: string) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load payments when buildingId or selectedMonth changes
  useEffect(() => {
    if (buildingId) {
      loadPayments();
    }
  }, [buildingId, selectedMonth]);

  // Load payments for the current building
  const loadPayments = useCallback(async () => {
    if (!buildingId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString()
      });
      
      // Add selectedMonth parameter if provided
      if (selectedMonth) {
        params.append('month', selectedMonth);
      }
      
      const response = await api.get(`/financial/payments/?${params}`);
      const data = response.data.results || response.data;
      setPayments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη των εισπράξεων';
      setError(errorMessage);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, selectedMonth]);

  // Δημιουργία νέας πληρωμής
  const createPayment = useCallback(async (data: PaymentFormData): Promise<Payment | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      let requestData: any;
      let headers: any = {};
      
      // If there's a file upload, use FormData
      if (data.receipt) {
        const formData = new FormData();
        formData.append('apartment', data.apartment_id.toString());
        formData.append('amount', data.amount.toString());
        formData.append('date', data.date);
        formData.append('method', data.method);
        formData.append('payment_type', data.payment_type);
        
        if (data.reference_number) {
          formData.append('reference_number', data.reference_number);
        }
        if (data.notes) {
          formData.append('notes', data.notes);
        }
        
        formData.append('receipt', data.receipt);
        
        requestData = formData;
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        // Use JSON for requests without file upload
        requestData = {
          apartment: data.apartment_id,
          amount: data.amount,
          date: data.date,
          method: data.method,
          payment_type: data.payment_type,
          reference_number: data.reference_number,
          notes: data.notes
        };
        headers['Content-Type'] = 'application/json';
      }

      const response = await api.post('/financial/payments/', requestData, { headers });

      // Refresh payments list after creating new payment
      await loadPayments();

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη δημιουργία της πληρωμής';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadPayments]);

  // Επεξεργασία πληρωμής (με ενημέρωση υπολοίπων)
  const processPayment = useCallback(async (data: PaymentFormData): Promise<{success: boolean, transaction_id?: number}> => {
    setIsLoading(true);
    setError(null);
    
    try {
      let requestData: any;
      let headers: any = {};
      
      // If there's a file upload, use FormData
      if (data.receipt) {
        const formData = new FormData();
        formData.append('apartment', data.apartment_id.toString());
        formData.append('amount', data.amount.toString());
        formData.append('date', data.date);
        formData.append('method', data.method);
        formData.append('payment_type', data.payment_type);
        
        if (data.reference_number) {
          formData.append('reference_number', data.reference_number);
        }
        if (data.notes) {
          formData.append('notes', data.notes);
        }
        
        formData.append('receipt', data.receipt);
        
        requestData = formData;
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        // Use JSON for requests without file upload
        requestData = {
          apartment: data.apartment_id,
          amount: data.amount,
          date: data.date,
          method: data.method,
          payment_type: data.payment_type,
          reference_number: data.reference_number,
          notes: data.notes
        };
        headers['Content-Type'] = 'application/json';
      }

      const response = await api.post('/financial/payments/process_payment/', requestData, { headers });

      // Refresh payments list after processing payment
      await loadPayments();

      return {
        success: true,
        transaction_id: response.data.transaction_id
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την επεξεργασία της πληρωμής';
      setError(errorMessage);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [loadPayments]);

  // Λήψη πληρωμών με φίλτρα
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

      const response = await api.get(`/financial/payments/?${params}`);

      return response.data.results || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη των πληρωμών';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη πληρωμής ανά ID
  const getPayment = useCallback(async (id: number): Promise<Payment | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/financial/payments/${id}/`);

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη της πληρωμής';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ενημέρωση πληρωμής
  const updatePayment = useCallback(async (id: number, data: Partial<PaymentFormData>): Promise<Payment | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      let requestData: any;
      let headers: any = {};
      
      // If there's a file upload, use FormData
      if (data.receipt) {
        const formData = new FormData();
        
        // Προσθήκη πεδίων που υπάρχουν
        if (data.apartment_id !== undefined) {
          formData.append('apartment', data.apartment_id.toString());
        }
        if (data.amount !== undefined) {
          formData.append('amount', data.amount.toString());
        }
        if (data.date) {
          formData.append('date', data.date);
        }
        if (data.method) {
          formData.append('method', data.method);
        }
        if (data.payment_type) {
          formData.append('payment_type', data.payment_type);
        }
        if (data.reference_number) {
          formData.append('reference_number', data.reference_number);
        }
        if (data.notes) {
          formData.append('notes', data.notes);
        }
        formData.append('receipt', data.receipt);
        
        requestData = formData;
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        // Use JSON for requests without file upload
        requestData = {};
        if (data.apartment_id !== undefined) {
          requestData.apartment = data.apartment_id;
        }
        if (data.amount !== undefined) {
          requestData.amount = data.amount;
        }
        if (data.date) {
          requestData.date = data.date;
        }
        if (data.method) {
          requestData.method = data.method;
        }
        if (data.payment_type) {
          requestData.payment_type = data.payment_type;
        }
        if (data.reference_number) {
          requestData.reference_number = data.reference_number;
        }
        if (data.notes) {
          requestData.notes = data.notes;
        }
        headers['Content-Type'] = 'application/json';
      }

      const response = await api.patch(`/financial/payments/${id}/`, requestData, { headers });

      // Refresh payments list after updating
      await loadPayments();

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την ενημέρωση της πληρωμής';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadPayments]);

  // Διαγραφή πληρωμής
  const deletePayment = useCallback(async (id: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.delete(`/financial/payments/${id}/`);
      
      // Refresh payments list after deleting
      await loadPayments();
      
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη διαγραφή της πληρωμής';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadPayments]);

  // Λήψη μεθόδων πληρωμής
  const getPaymentMethods = useCallback(async (): Promise<Array<{value: string, label: string}>> => {
    try {
      const response = await api.get('/financial/payments/methods/');
      return response.data;
    } catch (err: any) {
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
    payments,
    isLoading,
    error,
    
    // Actions
    createPayment,
    processPayment,
    getPayments,
    getPayment,
    updatePayment,
    deletePayment,
    getPaymentMethods,
    clearError,
    loadPayments,
  };
}; 