import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function usePublicInfo(buildingId?: number) {
  return useQuery({
    queryKey: ['public-info', buildingId],
    queryFn: async () => {
      const res = await api.get(`/public-info/?building=${buildingId}`);
      return res.data;
    },
    enabled: !!buildingId,
  });
}
