import { useQuery } from '@tanstack/react-query';

const fetchAnnouncements = async (buildingId: number) => {
  const res = await fetch(`/api/announcements/?building=${buildingId}`);
  if (!res.ok) {
    throw new Error('Σφάλμα κατά τη φόρτωση ανακοινώσεων');
  }
  return res.json();
};

export function useAnnouncements(buildingId?: number) {
  return useQuery({
    queryKey: ['announcements', buildingId],
    queryFn: () => fetchAnnouncements(buildingId!),
    enabled: !!buildingId,
  });
}
