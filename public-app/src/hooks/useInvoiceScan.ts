'use client';

import { useMutation } from '@tanstack/react-query';
import { scanInvoice } from '@/lib/api';
import { ScannedInvoiceData } from '@/types/financial';
import { toast } from 'sonner';

/**
 * Hook for scanning invoices using Google Gemini AI
 */
export function useInvoiceScan() {
  const mutation = useMutation<ScannedInvoiceData, Error, File>({
    mutationFn: async (file: File) => {
      return await scanInvoice(file);
    },
    onSuccess: (data) => {
      toast.success('Η ανάλυση του παραστατικού ολοκληρώθηκε επιτυχώς');
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Σφάλμα κατά την ανάλυση του παραστατικού';
      toast.error(errorMessage);
    },
  });

  return {
    scanInvoice: mutation.mutate,
    scanInvoiceAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

