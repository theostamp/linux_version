import { useQuery } from '@tanstack/react-query';
import { fetchPublicInfo } from '@/lib/api';

export function usePublicInfo(buildingId?: number) {
  return useQuery({
    queryKey: ['public-info', buildingId],
    queryFn: () => {
      if (!buildingId) {
        throw new Error('Missing building ID');
      }
      return fetchPublicInfo(buildingId);
    },
    enabled: !!buildingId,
  });
}