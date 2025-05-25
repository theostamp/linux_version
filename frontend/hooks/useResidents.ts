import { useQuery } from "@tanstack/react-query";
import { fetchResidents } from "@/lib/api";
import { useBuilding } from "@/components/contexts/BuildingContext";

export function useResidents() {
  const { currentBuilding } = useBuilding();

  return useQuery({
    queryKey: ["residents", currentBuilding?.id],
    queryFn: () => fetchResidents(currentBuilding!.id),
    enabled: !!currentBuilding?.id,
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
