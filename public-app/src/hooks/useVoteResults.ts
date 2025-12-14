'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchVoteResults } from '@/lib/api';

export interface VoteResults {
  ΝΑΙ: number;
  ΟΧΙ: number;
  ΛΕΥΚΟ: number;
  [key: string]: number;
}

export interface VoteResultsResponse {
  results: VoteResults;
  total: number;
}

export function useVoteResults(voteId?: number, buildingId?: number | null) {
  return useQuery<VoteResultsResponse>({
    queryKey: ['vote-results', voteId, buildingId],
    queryFn: async () => {
      return await fetchVoteResults(voteId!, buildingId);
    },
    enabled: !!voteId,
  });
}

