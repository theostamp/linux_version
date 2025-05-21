import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useVotes(buildingId?: number) {
  return useQuery({
    queryKey: ['votes', buildingId],
    queryFn: async () => {
      const { data } = await api.get(`/votes/?building=${buildingId}`);
      return data;
    },
    enabled: !!buildingId,
    select: (data) => Array.isArray(data) ? data : [], // ✅ εγγυάται array
  });
}
