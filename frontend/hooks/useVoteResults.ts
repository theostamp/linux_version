// frontend/hooks/useVoteResults.ts

import { useQuery } from '@tanstack/react-query';

// === Τύποι Ψηφοφορίας & Αποτελεσμάτων ===
export interface VoteResults {
  ΝΑΙ: number;
  ΟΧΙ: number;
  ΛΕΥΚΟ: number;
  [key: string]: number; // υποστήριξη για extra επιλογές
}

export interface VoteResultsResponse {
  results: VoteResults;
  total: number;
}

// === Χρήση στο react-query για αποτελέσματα ψηφοφορίας ===
export function useVoteResults(voteId?: number) {
  return useQuery<VoteResultsResponse>({
    queryKey: ['vote-results', voteId],
    queryFn: async () => {
      const res = await fetch(`/api/votes/${voteId}/results/`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Αποτυχία φόρτωσης αποτελεσμάτων ψηφοφορίας');
      }

      const data = await res.json();

      // Fallback υπολογισμός total αν δεν επιστραφεί από backend
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
