import { useQuery } from '@tanstack/react-query';

export function useVoteDetail(voteId?: number) {
  return useQuery({
    queryKey: ['vote', voteId],
    queryFn: async () => {
      const res = await fetch(`/api/votes/${voteId}/`, { credentials: 'include' });
      if (!res.ok) throw new Error('Αποτυχία φόρτωσης ψηφοφορίας');
      return await res.json();
    },
    enabled: !!voteId,
  });
}
