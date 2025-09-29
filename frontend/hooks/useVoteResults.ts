// frontend/hooks/useVoteResults.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api'; // ✅ Χρήση του axios instance

// === Τύποι Ψηφοφορίας & Αποτελεσμάτων ===
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

export function useVoteResults(voteId?: number) {
  return useQuery<VoteResultsResponse>({
    queryKey: ['vote-results', voteId],
    queryFn: async () => {
      const { data } = await api.get(`/votes/${voteId}/results/`);

      const results: VoteResults = data.results ?? {};
      const total: number =
        typeof data.total === 'number'
          ? data.total
          : Object.values(results).reduce(
              (acc, n) => acc + (Number(n) || 0),
              0
            );

      return { results, total };
    },
    enabled: !!voteId,
  });
}
