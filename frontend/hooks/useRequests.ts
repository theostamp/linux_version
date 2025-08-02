// frontend/hooks/useRequests.ts
import { useQuery } from '@tanstack/react-query';
import { fetchRequests } from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';

export function useRequests(buildingId?: number | null) {
  return useQuery<UserRequest[]>({
    queryKey: ['requests', buildingId],
    queryFn: async () => {
      return await fetchRequests({ buildingId });
    },
    enabled: buildingId !== undefined, // Allow null for all buildings
  });
}
