// frontend/hooks/useVotes.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchVotes, Vote } from '@/lib/api';

export function useVotes(
  buildingId?: number | null,
  options?: UseQueryOptions<Vote[], Error>
) {
  return useQuery<Vote[], Error>({
    queryKey: ['votes', buildingId],
    queryFn: () => {
      return fetchVotes(buildingId);
    },
    enabled: buildingId !== undefined,
    staleTime: 1000 * 60, // 1 λεπτό
    ...options,
  });
}
