"use client";

import { useResidents } from "@/hooks/useResidents";
import { useBuilding } from "@/components/contexts/BuildingContext";

export default function ResidentsListPage() {
  const { currentBuilding } = useBuilding();
  const { data: residents, isLoading, error } = useResidents();

  if (!currentBuilding) return <p>Δεν έχει επιλεγεί κάποιο κτίριο.</p>;
  if (isLoading) return <p>Φόρτωση...</p>;
  if (error) return <p>Σφάλμα φόρτωσης.</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        Κάτοικοι για το κτίριο: {currentBuilding.name}
      </h1>

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
//       </h2>
//       <div className="space-y-4">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
//             Email Κατοίκου:
//           </label>
//           <input
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//             className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"

//           />
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
//             Επιλέξτε Κτίριο:
//           </label>
//           <select
//             value={buildingId?.toString()}
//             onChange={(e) => setBuildingId(parseInt(e.target.value))}
//             className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
//           >
//             {buildings.map((b) => (
//               <option key={b.id} value={b.id}>
//                 {b.name || `Κτίριο #${b.id}`}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>
//       <button
//         type="submit"
//         disabled={loading}   
//         className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition"
//       >
//         {loading ? 'Αποστολή...' : 'Αντιστοίχιση'}
//       </button>
