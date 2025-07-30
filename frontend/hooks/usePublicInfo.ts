import { useQuery } from '@tanstack/react-query';
import { fetchPublicInfo } from '@/lib/api';

export function usePublicInfo(buildingId?: number | null) {
  return useQuery({
    queryKey: ['public-info', buildingId],
    queryFn: () => {
      if (buildingId === null) {
        // When buildingId is null, fetch data for all buildings
        return fetchPublicInfo(0); // Use 0 to indicate "all buildings"
      }
      if (!buildingId) {
        throw new Error('Building ID is required');
      }
      return fetchPublicInfo(buildingId);
    },
    enabled: buildingId !== undefined, // Don't run query when buildingId is undefined
  });
}