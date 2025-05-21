// frontend/hooks/useRequests.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';

export function useRequests(buildingId?: number) {
  return useQuery<UserRequest[]>({
    queryKey: ['requests', buildingId],
    queryFn: async () => {
      const { data } = await api.get(`/user-requests/?building=${buildingId}`);
      return Array.isArray(data) ? data : data.results ?? [];
    },
    enabled: !!buildingId,
  });
}
