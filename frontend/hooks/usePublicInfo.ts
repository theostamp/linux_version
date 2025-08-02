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
    staleTime: 30000, // 30 seconds - data is considered fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when internet connection is restored
    refetchInterval: 60000, // Refetch every minute for real-time updates
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors (building not found)
      if (error?.response?.status === 404) return false;
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}