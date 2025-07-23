// components/CreateRequestForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { createUserRequest, fetchBuildings, Building } from '@/lib/api';

// Προκαθορισμένες επιλογές για τον τύπο αίτησης
const REQUEST_TYPES = [
  { value: 'maintenance', label: 'Συντήρηση' },
  { value: 'cleaning', label: 'Καθαριότητα' },
  { value: 'technical', label: 'Τεχνικό' },
  { value: 'other', label: 'Άλλο' },
];

export default function CreateRequestForm() {
  const router = useRouter();

  // φόρμα state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [type, setType] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // λίστα κτιρίων για dropdown
  const [buildingOptions, setBuildingOptions] = useState<Building[]>([]);

  // σφάλματα & loading
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // φορτώνουμε κτίρια
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchBuildings();
        setBuildingOptions(data);
      } catch (e) {
        console.error('Failed to load buildings', e);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // client-side validation
    if (!title.trim() || !description.trim() || !selectedBuildingId) {
      setError('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.');
      return;
    }
    if (type && !REQUEST_TYPES.some((t) => t.value === type)) {
      setError('Μη έγκυρος τύπος αιτήματος.');
      return;
    }

    setSubmitting(true);
    try {
      await createUserRequest({
        title: title.trim(),
        description: description.trim(),
        building: Number(selectedBuildingId),   // πλέον υποχρεωτικό
        type: type || undefined,
        is_urgent: isUrgent || undefined,
      });
      router.push('/requests');
    } catch (err: any) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setError(`Σφάλμα: ${msg}`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Δημιουργία Αιτήματος</h2>
      {error && <ErrorMessage message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Τίτλος */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium">Τίτλος *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full border p-2 rounded"
          />
        </div>

        {/* Περιγραφή */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium">Περιγραφή *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-1 w-full border p-2 rounded h-24"
          />
        </div>

        {/* Κτίριο */}
        <div>
          <label htmlFor="building" className="block text-sm font-medium">Κτίριο *</label>
          <select
            id="building"
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            required
            className="mt-1 w-full border p-2 rounded"
          >
            <option value="">-- Επιλέξτε κτίριο --</option>
            {buildingOptions.map((b) => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Τύπος (προαιρετικό) */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium">Τύπος (προαιρετικό)</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full border p-2 rounded"
          >
            <option value="">-- Επιλέξτε τύπο --</option>
            {REQUEST_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Επείγον */}
        <div className="flex items-center">
          <input
            id="urgent"
            type="checkbox"
            checked={isUrgent}
            onChange={() => setIsUrgent(!isUrgent)}
            className="mr-2"
          />
          <label htmlFor="urgent" className="text-sm">Επείγον</label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? 'Υποβολή…' : 'Δημιουργία Αιτήματος'}
        </button>
      </form>
    </div>
  );
}
