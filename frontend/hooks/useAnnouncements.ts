// frontend/hooks/useAnnouncements.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api'; // Σωστό axios instance με interceptors

export function useAnnouncements(buildingId?: number) {
  return useQuery({
    queryKey: ['announcements', buildingId],
    queryFn: async () => {
      const response = await api.get(`/announcements/?building=${buildingId}`);
      return Array.isArray(response.data)
        ? response.data
        : response.data.results ?? [];
    },
    enabled: !!buildingId,
  });
}
