import { useQuery } from '@tanstack/react-query';

const fetchRequests = async (buildingId: number) => {
  const res = await fetch(`/api/requests/?building=${buildingId}`);
  if (!res.ok) {
    throw new Error('Σφάλμα κατά τη φόρτωση αιτημάτων');
  }
  return res.json();
};

export function useRequests(buildingId?: number) {
  return useQuery({
    queryKey: ['requests', buildingId],
    queryFn: () => fetchRequests(buildingId!),
    enabled: !!buildingId,
  });
}
