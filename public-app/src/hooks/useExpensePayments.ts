'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { parseAmount } from '@/lib/utils';
import { ExpensePayment } from '@/types/financial';
import { toast } from 'sonner';

interface CreateExpensePaymentPayload {
  expense: number;
  amount: number;
  payment_date: string;
  method: string;
  reference_number?: string;
  notes?: string;
  receipt?: File | null;
}

export const useExpensePayments = (buildingId?: number) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalize = (p: any): ExpensePayment => ({
    ...p,
    amount: parseAmount(p?.amount),
    expense_amount: parseAmount(p?.expense_amount),
  });

  const listExpensePayments = useCallback(async (expenseId?: number): Promise<ExpensePayment[]> => {
    if (!buildingId) return [];
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
      });
      if (expenseId) {
        params.append('expense', expenseId.toString());
      }
      const response = await api.get(`/financial/expense-payments/?${params}`);
      const data = response.data.results || response.data;
      return Array.isArray(data) ? data.map(normalize) : [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη πληρωμών δαπάνης';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  const createExpensePayment = useCallback(async (payload: CreateExpensePaymentPayload): Promise<ExpensePayment | null> => {
    if (!buildingId) {
      toast.error('Απαιτείται επιλογή κτιρίου.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('building_id', buildingId.toString());
      formData.append('expense', payload.expense.toString());
      formData.append('amount', payload.amount.toString());
      formData.append('payment_date', payload.payment_date);
      formData.append('method', payload.method);

      if (payload.reference_number) {
        formData.append('reference_number', payload.reference_number);
      }
      if (payload.notes) {
        formData.append('notes', payload.notes);
      }
      if (payload.receipt) {
        formData.append('receipt', payload.receipt);
      }

      const response = await api.post('/financial/expense-payments/', formData);
      toast.success('Η εξόφληση καταχωρήθηκε επιτυχώς.');
      return normalize(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την καταχώρηση εξόφλησης';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  return {
    listExpensePayments,
    createExpensePayment,
    isLoading,
    error,
  };
};
