'use client';
import { useBuilding } from '@/components/contexts/BuildingContext';
import Link from 'next/link';
import { deleteBuilding } from '@/lib/api';

const BuildingsPage = () => {
  const {
    buildings,
    error,
    isLoading,
    setCurrentBuilding,
    setBuildings,
    currentBuilding,
  } = useBuilding();

  const handleDelete = async (id: number) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το κτίριο;')) return;
    try {
      await deleteBuilding(id);
      const updated = buildings.filter((b) => b.id !== id);
      setBuildings(updated);
      if (currentBuilding?.id === id) {
        setCurrentBuilding(null);
      }
    } catch {
      alert('Αποτυχία διαγραφής');
    }
  };

  if (isLoading) return <p className="p-6">Φόρτωση...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!Array.isArray(buildings)) return <p className="p-6 text-gray-600">Δεν βρέθηκαν κτίρια.</p>;

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Διαχείριση Κτιρίων</h1>
        <Link href="/buildings/new" className="btn btn-primary">Νέο Κτίριο</Link>
      </header>

      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Όνομα</th>
            <th className="border p-2">Διεύθυνση</th>
            <th className="border p-2">Ενέργειες</th>
          </tr>
        </thead>
        <tbody>
          {buildings.map((b) => (
            <tr key={b.id}>
              <td className="border p-2">{b.id}</td>
              <td className="border p-2">{b.name}</td>
              <td className="border p-2">{b.address}</td>
              <td className="border p-2 space-x-2">
                <Link href={`/buildings/${b.id}/edit`} className="text-blue-600">Επεξεργασία</Link>
                <button onClick={() => handleDelete(b.id)} className="text-red-600">Διαγραφή</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BuildingsPage;
