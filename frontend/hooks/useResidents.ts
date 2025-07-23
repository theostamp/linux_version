import { useQuery } from "@tanstack/react-query";
import { fetchResidents } from "@/lib/api";

export function useResidents(buildingId?: number | null) {
  return useQuery({
    queryKey: ["residents", buildingId],
    queryFn: () => fetchResidents(buildingId!),
    enabled: buildingId !== undefined && buildingId !== null,
  });
}

export function useResidentsCount() {
  const { data: residents } = useResidents();
  return residents?.length ?? 0;
}

export function useResidentById(residentId: number) {
  const { data: residents } = useResidents();
  return residents?.find((resident) => resident.id === residentId);
}

export function useResidentByEmail(email: string) {
  const { data: residents } = useResidents();
  return residents?.find((resident) => resident.email === email);
}
