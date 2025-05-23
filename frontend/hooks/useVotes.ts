// frontend/hooks/useVotes.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchVotes, Vote } from '@/lib/api';

export function useVotes(
  buildingId: number,
  options?: UseQueryOptions<Vote[], Error>
) {
  return useQuery<Vote[], Error>({
    queryKey: ['votes', buildingId],
    queryFn: () => fetchVotes(buildingId),
    enabled: !!buildingId,
    ...options, // ← δίνει δυνατότητα override
  });
}
