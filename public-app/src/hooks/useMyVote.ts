'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet, type LinkedVoteSubmission } from '@/lib/api';

export type MyVote =
  | { linked: true; submissions: LinkedVoteSubmission[] }
  | {
      linked: false;
      id: number;
      choice: string;
      receipt_id?: string | null;
      last_submitted_at?: string | null;
      vote_source?: string | null;
    }
  | null;

interface LegacyMyVote {
  id: number;
  vote: number;
  choice: string;
  created_at?: string;
  submitted_at?: string;
  updated_at?: string;
  last_submitted_at?: string;
  receipt_id?: string;
  vote_source?: string;
}

export function useMyVote(voteId?: number, buildingId?: number | null) {
  return useQuery<MyVote>({
    queryKey: ['myVote', voteId, buildingId],
    queryFn: async () => {
      try {
        // Backend returns:
        // - 200 + VoteSubmission payload when user has voted
        // - 200 + { linked: true, submissions: [...] } for linked votes (per apartment)
        // - 404 when vote is not accessible
        // Older backend versions returned 200 with { choice: null } so we guard for that too.
        const params: Record<string, number> = {};
        if (typeof buildingId === 'number') {
          params.building = buildingId;
        }
        const data = await apiGet<unknown>(`/votes/${voteId}/my-submission/`, params);
        if (!data || typeof data !== 'object') return null;
        const linked = (data as { linked?: unknown }).linked;
        if (linked === true) {
          const submissions = (data as { submissions?: unknown }).submissions;
          return {
            linked: true,
            submissions: Array.isArray(submissions) ? (submissions as LinkedVoteSubmission[]) : [],
          };
        }

        const record = data as Partial<LegacyMyVote> & { choice?: unknown };
        if (!record.id) return null;
        if (record.choice === null || record.choice === undefined) return null;
        return {
          linked: false,
          id: record.id,
          choice: String(record.choice),
          receipt_id: record.receipt_id ?? null,
          last_submitted_at: record.last_submitted_at || record.updated_at || record.submitted_at || record.created_at || null,
          vote_source: record.vote_source ?? null,
        };
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
