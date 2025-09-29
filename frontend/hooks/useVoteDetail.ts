// frontend/hooks/useVoteDetail.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api'; // ✅ χρήση του custom axios instance

export function useVoteDetail(voteId?: number) {
  return useQuery({
    queryKey: ['vote', voteId],
    queryFn: async () => {
      const res = await api.get(`/votes/${voteId}/`);
      return res.data;
    },
    enabled: !!voteId,
  });
}
