// frontend/app/buildings/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { fetchBuildings, deleteBuilding, Building } from '@/lib/api';
import Link from 'next/link';

const BuildingsPage = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchBuildings();
        setBuildings(data);
      } catch (e) {
        setError('Αποτυχία φόρτωσης κτιρίων');
      }
    }
    load();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το κτίριο;')) return;
    try {
      await deleteBuilding(id);
      setBuildings(prev => prev.filter(b => b.id !== id));
    } catch {
      alert('Αποτυχία διαγραφής');
    }
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Διαχείριση Κτιρίων</h1>
        <Link href="/buildings/new" className="btn btn-primary">Νέο Κτίριο</Link>
      </header>
      {error && <p className="text-red-600">{error}</p>}
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
          {buildings.map(b => (
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
