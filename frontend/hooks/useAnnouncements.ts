// frontend/hooks/useAnnouncements.ts

import { useQuery } from '@tanstack/react-query';
import { fetchAnnouncements } from '@/lib/api';

export function useAnnouncements(buildingId?: number | null) {
  return useQuery({
    queryKey: ['announcements', buildingId],
    queryFn: async () => {
      return await fetchAnnouncements(buildingId);
    },
    enabled: buildingId !== undefined,
  });
}
