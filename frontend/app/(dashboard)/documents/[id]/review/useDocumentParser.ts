'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Ο τύπος δεδομένων για τις λεπτομέρειες ενός παραστατικού
export interface DocumentUploadDetail {
  id: number;
  original_filename: string;
  original_file_url?: string; // Το URL για την προεπισκόπηση στο iframe
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'awaiting_confirmation';
  created_at: string;
  error_message?: string;
  extracted_data?: Record<string, any>;
  confidence_score?: number;
}

// Hook για την ανάκτηση ενός παραστατικού με βάση το ID του
const fetchDocumentUpload = async (id: string): Promise<DocumentUploadDetail> => {
  const response = await api.get(`/parser/uploads/${id}/`);
  return response.data;
};

export const useGetDocumentUpload = (id: string) => {
  return useQuery<DocumentUploadDetail, Error>({
    queryKey: ['documentUpload', id],
    queryFn: () => fetchDocumentUpload(id),
    enabled: !!id, // Εκτελείται μόνο αν υπάρχει ID
  });
};

// Hook για την επιβεβαίωση και καταχώρηση των δεδομένων ενός παραστατικού
const confirmDocument = async ({ id, data }: { id: string; data: Record<string, any> }) => {
  const response = await api.post(`/parser/uploads/${id}/confirm_and_create_expense/`, data);
  return response.data;
};

export const useConfirmDocument = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: Record<string, any>) => confirmDocument({ id, data }),
    onSuccess: (data) => {
      toast.success(data.message || 'Το παραστατικό καταχωρήθηκε επιτυχώς!');
      queryClient.invalidateQueries({ queryKey: ['documentUploads'] });
      router.push('/documents'); 
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Παρουσιάστηκε σφάλμα κατά την καταχώρηση.');
    },
  });
};