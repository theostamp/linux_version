'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { Vote } from '@/lib/api';

export function useVoteDetail(voteId?: number) {
  return useQuery<Vote>({
    queryKey: ['vote', voteId],
    queryFn: async () => {
      return await apiGet<Vote>(`/votes/${voteId}/`);
    },
    enabled: !!voteId,
  });
}

