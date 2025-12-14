'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { Vote } from '@/lib/api';

export function useVoteDetail(voteId?: number, buildingId?: number | null) {
  return useQuery<Vote>({
    queryKey: ['vote', voteId, buildingId],
    queryFn: async () => {
      const params: Record<string, number> = {};
      if (typeof buildingId === 'number') {
        params.building = buildingId;
      }
      return await apiGet<Vote>(`/votes/${voteId}/`, params);
    },
    enabled: !!voteId,
  });
}

