"use client";

import { useResidents } from "@/hooks/useResidents";
import { useBuilding } from "@/components/contexts/BuildingContext";
import BuildingFilterIndicator from "@/components/BuildingFilterIndicator";

export default function ResidentsListPage() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  
  // Χρησιμοποιούμε το selectedBuilding για φιλτράρισμα, ή το currentBuilding αν δεν έχει επιλεγεί κάτι
  const buildingId = selectedBuilding?.id || currentBuilding?.id;
  const buildingToUse = selectedBuilding || currentBuilding;
  
  const { data: residents, isLoading, error } = useResidents(buildingId);

  if (!buildingToUse) return <p>Δεν έχει επιλεγεί κάποιο κτίριο.</p>;
  if (isLoading) return <p>Φόρτωση...</p>;
  if (error) return <p>Σφάλμα φόρτωσης.</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Κάτοικοι</h1>
      <BuildingFilterIndicator className="mb-4" />
      <p className="text-sm text-gray-600 mb-4">
        Κτίριο: <strong>{buildingToUse.name}</strong>
      </p>

      {residents?.length === 0 ? (
        <p>Δεν υπάρχουν κάτοικοι ή διαχειριστές.</p>
      ) : (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Ρόλος</th>
              <th className="border px-4 py-2">Ημ/νία Αντιστοίχισης</th>
            </tr>
          </thead>
          <tbody>
            {(residents ?? []).map((res: any) => (
              <tr key={res.id}>
                <td className="border px-4 py-2">{res.resident}</td>
                <td className="border px-4 py-2">{res.role}</td>
                <td className="border px-4 py-2">
                  {new Date(res.created_at).toLocaleDateString("el-GR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
