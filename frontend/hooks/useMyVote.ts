import { useQuery } from '@tanstack/react-query';

export function useMyVote(voteId?: number) {
  return useQuery({
    queryKey: ['my-vote', voteId],
    queryFn: async () => {
      const res = await fetch(`/api/votes/${voteId}/my-submission/`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      return await res.json(); 
    },
    enabled: !!voteId,
    retry: false,
  });
}
