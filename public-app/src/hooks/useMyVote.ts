'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

interface MyVote {
  id: number;
  vote: number;
  choice: string;
  created_at: string;
}

export function useMyVote(voteId?: number, buildingId?: number | null) {
  return useQuery<MyVote | null>({
    queryKey: ['myVote', voteId, buildingId],
    queryFn: async () => {
      try {
        // Backend returns:
        // - 200 + VoteSubmission payload when user has voted
        // - 404 when no submission exists
        // Older backend versions returned 200 with { choice: null } so we guard for that too.
        const params: Record<string, number> = {};
        if (typeof buildingId === 'number') {
          params.building = buildingId;
        }
        const data = await apiGet<unknown>(`/votes/${voteId}/my-submission/`, params);
        if (!data || typeof data !== 'object') return null;
        const record = data as Partial<MyVote> & { choice?: unknown };
        if (!record.id) return null;
        if (record.choice === null || record.choice === undefined) return null;
        return record as MyVote;
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        if (err?.response?.status === 404) return null;
        // Some API errors expose status at top-level
        const err2 = error as { status?: number };
        if (err2?.status === 404) return null;
        throw error;
      }
    },
    enabled: voteId !== undefined,
  });
}

