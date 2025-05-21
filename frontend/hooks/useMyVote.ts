// frontend/hooks/useMyVote.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useMyVote(voteId?: number) {
  return useQuery({
    queryKey: ['myVote', voteId],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/votes/${voteId}/my-submission/`);
        return data;
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: voteId !== undefined,
  });
}
