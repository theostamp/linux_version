import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Payment, PaymentFormData, PaymentFilters } from '@/types/financial';
import { api, invalidateApiCache } from '@/lib/api';
import { parseAmount } from '@/lib/utils';
import { toast } from 'sonner';

export const usePayments = (buildingId?: number, selectedMonth?: string) => {
  const queryClient = useQueryClient();
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
      
      // The api.get returns data directly, not response.data
      const response = await api.get<{ results?: Payment[] } | Payment[]>(`/financial/payments/?${params}`);
      
      // Handle both paginated and non-paginated responses
      const data = (response as { results?: Payment[] }).results || (response as Payment[]);
      
      // Normalize payment amounts to ensure they are numbers
      const normalize = (p: any): Payment => ({
        ...p,
        amount: parseAmount(p?.amount),
      });
      
      setPayments(Array.isArray(data) ? data.map(normalize) : []);
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
      const headers: any = {};
      
      // If there's a file upload, use FormData
      if (data.receipt) {
        const formData = new FormData();
        formData.append('apartment', data.apartment_id.toString());
        formData.append('amount', data.amount.toFixed(2));
        formData.append('reserve_fund_amount', (data.reserve_fund_amount || 0).toString());
        formData.append('previous_obligations_amount', (data.previous_obligations_amount || 0).toString());
        formData.append('date', data.date);
        formData.append('method', data.method);
        formData.append('payment_type', data.payment_type);
        formData.append('payer_type', data.payer_type);
        if (data.payer_name) {
          formData.append('payer_name', data.payer_name);
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
        requestData = {
          apartment: data.apartment_id,
          amount: parseFloat(data.amount.toFixed(2)),
          reserve_fund_amount: parseFloat((data.reserve_fund_amount || 0).toString()),
          previous_obligations_amount: parseFloat((data.previous_obligations_amount || 0).toString()),
          date: data.date,
          method: data.method,
          payment_type: data.payment_type,
          payer_type: data.payer_type,
          payer_name: data.payer_name,
          reference_number: data.reference_number,
          notes: data.notes
        };
        headers['Content-Type'] = 'application/json';
      }

      // The api.post returns data directly
      const response = await api.post<Payment>('/financial/payments/', requestData);

      // Refresh payments list after creating new payment
      await loadPayments();
      
      // ✅ Invalidate AND explicitly refetch React Query caches for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['financial'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['apartment-balances'] });
      await queryClient.refetchQueries({ queryKey: ['financial'] });
      await queryClient.refetchQueries({ queryKey: ['payments'] });
      await queryClient.refetchQueries({ queryKey: ['apartment-balances'] });
      
      toast.success('Η πληρωμή δημιουργήθηκε επιτυχώς');
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη δημιουργία της πληρωμής';
      setError(errorMessage);
      toast.error(errorMessage);
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
      const headers: any = {};
      
      // If there's a file upload, use FormData
      if (data.receipt) {
        const formData = new FormData();
        formData.append('apartment', data.apartment_id.toString());
        formData.append('amount', data.amount.toFixed(2));
        formData.append('reserve_fund_amount', (data.reserve_fund_amount || 0).toString());
        formData.append('previous_obligations_amount', (data.previous_obligations_amount || 0).toString());
        formData.append('date', data.date);
        formData.append('method', data.method);
        formData.append('payment_type', data.payment_type);
        formData.append('payer_type', data.payer_type);
        if (data.payer_name) {
          formData.append('payer_name', data.payer_name);
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
        requestData = {
          apartment: data.apartment_id,
          amount: parseFloat(data.amount.toFixed(2)),
          reserve_fund_amount: parseFloat((data.reserve_fund_amount || 0).toString()),
          previous_obligations_amount: parseFloat((data.previous_obligations_amount || 0).toString()),
          date: data.date,
          method: data.method,
          payment_type: data.payment_type,
          payer_type: data.payer_type,
          payer_name: data.payer_name,
          reference_number: data.reference_number,
          notes: data.notes
        };
        headers['Content-Type'] = 'application/json';
      }

      // The api.post returns data directly
      const response = await api.post<{ transaction_id?: number }>('/financial/payments/process_payment/', requestData);

      // Refresh payments list after processing payment
      await loadPayments();

      // ✅ Invalidate AND explicitly refetch React Query caches for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['financial'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['apartment-balances'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.refetchQueries({ queryKey: ['financial'] });
      await queryClient.refetchQueries({ queryKey: ['payments'] });
      await queryClient.refetchQueries({ queryKey: ['apartment-balances'] });
      await queryClient.refetchQueries({ queryKey: ['transactions'] });

      toast.success('Η πληρωμή επεξεργάστηκε επιτυχώς');
      return {
        success: true,
        transaction_id: response.transaction_id
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την επεξεργασία της πληρωμής';
      setError(errorMessage);
      toast.error(errorMessage);
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

      // The api.get returns data directly
      const response = await api.get<{ results?: Payment[] } | Payment[]>(`/financial/payments/?${params}`);
      
      // Handle both paginated and non-paginated responses
      const data = (response as { results?: Payment[] }).results || (response as Payment[]);
      
      // Normalize payment amounts to ensure they are numbers
      const normalize = (p: any): Payment => ({
        ...p,
        amount: parseAmount(p?.amount),
      });
      
      return Array.isArray(data) ? data.map(normalize) : [];
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
      // The api.get returns data directly
      const response = await api.get<Payment>(`/financial/payments/${id}/`);
      
      // Normalize payment amount to ensure it is a number
      return {
        ...response,
        amount: parseAmount(response?.amount),
      };
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
      const headers: any = {};
      
      // If there's a file upload, use FormData
      if (data.receipt) {
        const formData = new FormData();
        
        // Προσθήκη πεδίων που υπάρχουν
        if (data.apartment_id !== undefined) {
          formData.append('apartment', data.apartment_id.toString());
        }
        if (data.amount !== undefined) {
          formData.append('amount', data.amount.toFixed(2));
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

      // The api.patch returns data directly
      const response = await api.patch<Payment>(`/financial/payments/${id}/`, requestData);

      // Refresh payments list after updating
      await loadPayments();

      // ✅ Invalidate AND explicitly refetch React Query caches for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['financial'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['apartment-balances'] });
      await queryClient.refetchQueries({ queryKey: ['financial'] });
      await queryClient.refetchQueries({ queryKey: ['payments'] });
      await queryClient.refetchQueries({ queryKey: ['apartment-balances'] });

      toast.success('Η πληρωμή ενημερώθηκε επιτυχώς');
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την ενημέρωση της πληρωμής';
      setError(errorMessage);
      toast.error(errorMessage);
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
      
      // ✅ Clear API-level cache for financial endpoints (already done by api.delete, but ensuring it)
      invalidateApiCache('/api/financial/');
      
      // ✅ Invalidate React Query caches BEFORE refetching to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['financial'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['apartment-balances'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Refresh payments list after deleting
      await loadPayments();
      
      // ✅ Explicit refetch for components using React Query hooks
      await queryClient.refetchQueries({ queryKey: ['financial'] });
      await queryClient.refetchQueries({ queryKey: ['payments'] });
      await queryClient.refetchQueries({ queryKey: ['apartment-balances'] });
      await queryClient.refetchQueries({ queryKey: ['transactions'] });
      
      toast.success('Η πληρωμή διαγράφηκε επιτυχώς');
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη διαγραφή της πληρωμής';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadPayments, queryClient]);

  // Μαζική διαγραφή πληρωμών διαμερίσματος (προαιρετικά για συγκεκριμένο μήνα)
  const deletePaymentsForApartment = useCallback(
    async (apartmentId: number, month?: string, buildingId?: number): Promise<{success: boolean; deleted_count?: number; total_amount?: number; message?: string}> => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ apartment_id: apartmentId.toString() });
        if (month) params.append('month', month);
        if (buildingId) params.append('building_id', buildingId.toString());

        // The api.delete returns data directly
        const response = await api.delete<{ deleted_count?: number; total_amount?: number; message?: string }>(`/financial/payments/bulk_delete/?${params.toString()}`);

        // Refresh list after bulk delete
        await loadPayments();

        // ✅ Invalidate AND explicitly refetch React Query caches for immediate UI update
        await queryClient.invalidateQueries({ queryKey: ['financial'] });
        await queryClient.invalidateQueries({ queryKey: ['payments'] });
        await queryClient.invalidateQueries({ queryKey: ['apartment-balances'] });
        await queryClient.invalidateQueries({ queryKey: ['transactions'] });
        await queryClient.refetchQueries({ queryKey: ['financial'] });
        await queryClient.refetchQueries({ queryKey: ['payments'] });
        await queryClient.refetchQueries({ queryKey: ['apartment-balances'] });
        await queryClient.refetchQueries({ queryKey: ['transactions'] });

        const deletedCount = response.deleted_count || 0;
        toast.success(`Διαγράφηκαν ${deletedCount} πληρωμές επιτυχώς`);
        return { success: true, ...response };
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη μαζική διαγραφή πληρωμών';
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [loadPayments]
  );

  // Λήψη μεθόδων πληρωμής
  const getPaymentMethods = useCallback(async (): Promise<Array<{value: string, label: string}>> => {
    try {
      // The api.get returns data directly
      const response = await api.get<Array<{value: string, label: string}>>('/financial/payments/methods/');
      return response;
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
    deletePaymentsForApartment,
    getPaymentMethods,
    clearError,
    loadPayments,
  };
};

