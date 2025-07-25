'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { fetchBuildings, Building } from '@/lib/api';
import { useCreateRequest } from '@/hooks/useCreateRequest'; // ✅ νέο hook

const TYPE_CHOICES = [
  { value: 'maintenance', label: 'Συντήρηση' },
  { value: 'cleaning', label: 'Καθαριότητα' },
  { value: 'technical', label: 'Τεχνικό' },
  { value: 'security', label: 'Ασφάλεια' },
  { value: 'noise', label: 'Θόρυβος' },
  { value: 'other', label: 'Άλλο' },
];

export default function NewRequestPage() {
  const router = useRouter();
  const { mutateAsync: createRequest, isPending, isError } = useCreateRequest(); // ✅

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [type, setType] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [buildingOptions, setBuildingOptions] = useState<Building[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBuildings() {
      try {
        const data = await fetchBuildings();
        if (Array.isArray(data)) {
          setBuildingOptions(data);
        } else if (data && Array.isArray((data as any).results)) {
          setBuildingOptions((data as any).results);
        } else {
          console.warn('Unexpected buildings response:', data);
          setBuildingOptions([]);
        }
      } catch (err) {
        console.error('Load buildings failed:', err);
        setBuildingOptions([]);
      }
    }
    loadBuildings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !description.trim() || !selectedBuildingId) {
      setFormError('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.');
      return;
    }

    if (type && !TYPE_CHOICES.some((t) => t.value === type)) {
      setFormError('Μη έγκυρος τύπος αιτήματος.');
      return;
    }

    try {
      await createRequest({
        title: title.trim(),
        description: description.trim(),
        building: Number(selectedBuildingId),
        type: type || undefined,
        is_urgent: isUrgent || undefined,
      });
      router.push('/requests');
    } catch (err) {
      console.error('Create request failed:', err);
      setFormError('Αποτυχία υποβολής αιτήματος. Δοκιμάστε ξανά.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-2xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">Νέο Αίτημα</h1>
      {formError && <ErrorMessage message={formError} />}
      {isError && <ErrorMessage message="Σφάλμα κατά την υποβολή." />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Τίτλος */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Τίτλος *
          </label>
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
          <label htmlFor="description" className="block text-sm font-medium">
            Περιγραφή *
          </label>
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
          <label htmlFor="building" className="block text-sm font-medium">
            Κτίριο *
          </label>
          <select
            id="building"
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            required
            className="mt-1 w-full border p-2 rounded"
          >
            <option value="">-- Επιλέξτε κτίριο --</option>
            {buildingOptions.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Τύπος */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium">
            Τύπος (προαιρετικό)
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full border p-2 rounded"
          >
            <option value="">-- Επιλέξτε τύπο --</option>
            {TYPE_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
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
          <label htmlFor="urgent" className="text-sm">
            Επείγον
          </label>
        </div>

        {/* Υποβολή */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? 'Υποβολή…' : 'Δημιουργία Αιτήματος'}
        </button>
      </form>
    </div>
  );
}
