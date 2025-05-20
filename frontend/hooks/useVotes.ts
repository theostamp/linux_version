import { useQuery } from '@tanstack/react-query';

export function useVotes(buildingId?: number) {
  return useQuery({
    queryKey: ['votes', buildingId],
    queryFn: async () => {
      const res = await fetch(`/api/votes/?building=${buildingId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Αποτυχία φόρτωσης ψηφοφοριών');
      return await res.json();
    },
    enabled: !!buildingId,
  });
}
