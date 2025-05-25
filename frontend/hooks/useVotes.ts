// frontend/hooks/useVotes.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchVotes, Vote } from '@/lib/api';

export function useVotes(
  buildingId?: number,
  options?: UseQueryOptions<Vote[], Error>
) {
  return useQuery<Vote[], Error>({
    queryKey: ['votes', buildingId],
    queryFn: () => {
      if (!buildingId) {
        throw new Error('Missing building ID');
      }
      return fetchVotes(buildingId);
    },
    enabled: !!buildingId,
    staleTime: 1000 * 60, // 1 λεπτό
    ...options,
  });
}
