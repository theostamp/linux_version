"use client";

import { useResidents } from "@/hooks/useResidents";
import { useBuilding } from "@/components/contexts/BuildingContext";
import BuildingFilterIndicator from "@/components/BuildingFilterIndicator";
import Link from "next/link";
import { Resident } from "@/lib/api";

export default function ResidentsListPage() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  
  // Χρησιμοποιούμε το selectedBuilding για φιλτράρισμα, ή το currentBuilding αν δεν έχει επιλεγεί κάτι
  const buildingId = selectedBuilding?.id || currentBuilding?.id;
  const buildingToUse = selectedBuilding || currentBuilding;
  
  const { data: residents, isLoading, error } = useResidents(buildingId);

  if (!buildingToUse) return <p>Δεν έχει επιλεγεί κάποιο κτίριο.</p>;
  if (isLoading) return <p>Φόρτωση...</p>;
  if (error) return <p>Σφάλμα φόρτωσης.</p>;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'manager': return 'Διαχειριστής';
      case 'owner': return 'Ιδιοκτήτης';
      case 'tenant': return 'Ένοικος';
      default: return role;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Κάτοικοι</h1>
        <Link 
          href="/residents/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Προσθήκη Κατοίκου
        </Link>
      </div>
      
      <BuildingFilterIndicator className="mb-4" />
      <p className="text-sm text-gray-600 mb-4">
        Κτίριο: <strong>{buildingToUse.name}</strong>
      </p>

      {residents?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Δεν υπάρχουν κάτοικοι σε αυτό το κτίριο.</p>
          <Link 
            href="/residents/new"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            Προσθήκη Πρώτου Κατοίκου
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border px-4 py-3 text-left font-semibold">Όνομα</th>
                <th className="border px-4 py-3 text-left font-semibold">Email</th>
                <th className="border px-4 py-3 text-left font-semibold">Διαμέρισμα</th>
                <th className="border px-4 py-3 text-left font-semibold">Ρόλος</th>
                <th className="border px-4 py-3 text-left font-semibold">Τηλέφωνο</th>
                <th className="border px-4 py-3 text-left font-semibold">Ημ/νία Αντιστοίχισης</th>
              </tr>
            </thead>
            <tbody>
              {(residents ?? []).map((res: Resident) => (
                <tr key={res.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-3">
                    {res.user_first_name} {res.user_last_name}
                  </td>
                  <td className="border px-4 py-3">{res.user_email}</td>
                  <td className="border px-4 py-3 font-medium">{res.apartment}</td>
                  <td className="border px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      res.role === 'manager' ? 'bg-red-100 text-red-800' :
                      res.role === 'owner' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {getRoleLabel(res.role)}
                    </span>
                  </td>
                  <td className="border px-4 py-3">{res.phone || '-'}</td>
                  <td className="border px-4 py-3 text-sm text-gray-600">
                    {new Date(res.created_at).toLocaleDateString("el-GR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
