'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

interface MyVote {
  id: number;
  vote: number;
  choice: string;
  created_at: string;
}

export function useMyVote(voteId?: number) {
  return useQuery<MyVote | null>({
    queryKey: ['myVote', voteId],
    queryFn: async () => {
      try {
        return await apiGet<MyVote>(`/votes/${voteId}/my-submission/`);
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        if (err?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: voteId !== undefined,
  });
}

