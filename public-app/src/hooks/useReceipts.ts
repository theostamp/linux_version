import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface FinancialReceipt {
  id: number;
  payment: {
    id: number;
    apartment: {
      id: number;
      number: string;
      owner_name: string;
    };
    amount: number;
    date: string;
    method: string;
    method_display: string;
    payment_type: string;
    payment_type_display: string;
    payer_type: string;
    payer_name: string;
    reference_number: string;
    notes: string;
  };
  receipt_type: string;
  receipt_type_display: string;
  amount: number;
  receipt_date: string;
  receipt_number: string;
  reference_number: string;
  payer_name: string;
  payer_type: string;
  payer_type_display: string;
  notes: string;
  receipt_file: string | null;
  receipt_file_url: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  apartment_number: string;
  building_name: string;
}

export interface CreateReceiptData {
  payment: number;
  receipt_type: string;
  amount: number;
  receipt_date: string;
  reference_number?: string;
  payer_name: string;
  payer_type: string;
  notes?: string;
  receipt_file?: File;
}

export const useReceipts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReceipts = useCallback(async (buildingId?: number, paymentId?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (buildingId) params.append('building_id', buildingId.toString());
      if (paymentId) params.append('payment_id', paymentId.toString());

      // The api.get returns data directly
      const response = await api.get<FinancialReceipt[]>(`/financial/receipts/?${params}`);
      return Array.isArray(response) ? response : [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Σφάλμα κατά τη φόρτωση των αποδείξεων';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createReceipt = useCallback(async (receiptData: CreateReceiptData): Promise<FinancialReceipt> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add basic fields
      formData.append('payment', receiptData.payment.toString());
      formData.append('receipt_type', receiptData.receipt_type);
      formData.append('amount', receiptData.amount.toString());
      formData.append('receipt_date', receiptData.receipt_date);
      formData.append('payer_name', receiptData.payer_name);
      formData.append('payer_type', receiptData.payer_type);
      
      // Add optional fields
      if (receiptData.reference_number) {
        formData.append('reference_number', receiptData.reference_number);
      }
      if (receiptData.notes) {
        formData.append('notes', receiptData.notes);
      }
      if (receiptData.receipt_file) {
        formData.append('receipt_file', receiptData.receipt_file);
      }

      // The api.post returns data directly
      const response = await api.post<FinancialReceipt>('/financial/receipts/', formData);

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Σφάλμα κατά τη δημιουργία της απόδειξης';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateReceipt = useCallback(async (receiptId: number, receiptData: Partial<CreateReceiptData>): Promise<FinancialReceipt> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add fields that are provided
      Object.entries(receiptData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'receipt_file' && value instanceof File) {
            formData.append(key, value);
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response = await api.patch(`/financial/receipts/${receiptId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // The api.patch returns data directly
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Σφάλμα κατά την ενημέρωση της απόδειξης';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteReceipt = useCallback(async (receiptId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await api.delete(`/financial/receipts/${receiptId}/`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Σφάλμα κατά τη διαγραφή της απόδειξης';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getReceiptTypes = useCallback(async () => {
    try {
      // The api.get returns data directly
      const response = await api.get<string[]>('/financial/receipts/receipt_types/');
      return Array.isArray(response) ? response : [];
    } catch (err: any) {
      console.error('Error loading receipt types:', err);
      return [];
    }
  }, []);

  return {
    isLoading,
    error,
    loadReceipts,
    createReceipt,
    updateReceipt,
    deleteReceipt,
    getReceiptTypes,
  };
};

