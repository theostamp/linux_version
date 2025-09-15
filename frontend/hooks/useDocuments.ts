'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api'; // Υποθέτουμε ότι υπάρχει ένα helper για τις κλήσεις API

// Υποθέτουμε ότι υπάρχει ένα αρχείο types/documents.ts με τον παρακάτω τύπο
export interface DocumentUpload {
  id: number;
  original_filename: string;
  status: 'pending' | 'processing' | 'awaiting_confirmation' | 'completed' | 'failed';
  created_at: string;
  error_message?: string;
}

const fetchDocuments = async (): Promise<DocumentUpload[]> => {
  const response = await api.get('/parser/uploads/');
  return response.data.results; // Υποθέτουμε ότι τα αποτελέσματα είναι σε pagination
};

export const useDocuments = () => {
  return useQuery<DocumentUpload[], Error>({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
    refetchInterval: (query) => {
      const isProcessing = query.state.data?.some(doc => 
        doc.status === 'pending' || doc.status === 'processing' || doc.status === 'awaiting_confirmation'
      );
      return isProcessing ? 5000 : false; // Poll κάθε 5 δευτερόλεπτα ΜΟΝΟ αν κάτι τρέχει
    },
  });
};