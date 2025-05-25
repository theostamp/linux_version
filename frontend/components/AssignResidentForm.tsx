// frontend/components/AssignResidentForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function AssignResidentForm() {
  const { buildings } = useBuilding();
  const [email, setEmail] = useState('');
  const [buildingId, setBuildingId] = useState<number | null>(
    buildings.length > 0 ? buildings[0].id : null
  );
  const [loading, setLoading] = useState(false);

  // ✅ Βελτιστοποίηση: Αν τα buildings έρθουν ασύγχρονα, ορίζουμε το πρώτο διαθέσιμο
  useEffect(() => {
    if (!buildingId && buildings.length > 0) {
      setBuildingId(buildings[0].id);
    }
  }, [buildings, buildingId]);

  // 🔁 Fallback αν δεν υπάρχουν καθόλου κτίρια
  if (!buildingId) {
    return (
      <div className="text-center text-gray-700 dark:text-gray-300 mt-6">
        Δεν υπάρχουν διαθέσιμα κτίρια. Δημιουργήστε πρώτα ένα κτίριο.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !buildingId) return toast.error('Συμπληρώστε όλα τα πεδία.');

    setLoading(true);
    try {
      const res = await api.post('/buildings/assign-resident/', {
        user_email: email,
        building: buildingId,
        role: 'resident',
      });
      toast.success(res.data.message ?? 'Η αντιστοίχιση έγινε επιτυχώς.');
      setEmail('');
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail ?? 'Παρουσιάστηκε σφάλμα κατά την αποστολή.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto bg-white dark:bg-gray-900 shadow-md rounded p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Αντιστοίχιση Κατοίκου σε Κτίριο
      </h2>

      <div>
        <label
          htmlFor="resident-email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email Κατοίκου:
        </label>
        <input
          id="resident-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
        />
      </div>

      <div>
        <label
          htmlFor="building-select"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Επιλέξτε Κτίριο:
        </label>
        <select
          id="building-select"
          value={buildingId?.toString()}
          onChange={(e) => setBuildingId(parseInt(e.target.value))}
          className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
        >
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name || `Κτίριο #${b.id}`}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition"
      >
        {loading ? 'Αποστολή...' : 'Αντιστοίχιση'}
      </button>
    </form>
  );
}
