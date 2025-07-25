'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { createUserRequest } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { useRequests } from '@/hooks/useRequests';
import RequestCard from '@/components/RequestCard';
import RequestSkeleton from '@/components/RequestSkeleton';
import SupportButton from '@/components/SupportButton';
import { useQueryClient } from '@tanstack/react-query';

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
  const { currentBuilding, selectedBuilding } = useBuilding();
  
  // Χρησιμοποιούμε το selectedBuilding για φιλτράρισμα, ή το currentBuilding αν δεν έχει επιλεγεί κάτι
  const buildingId = selectedBuilding?.id || currentBuilding?.id;
  const buildingToUse = selectedBuilding || currentBuilding;
  
  const { data: requests, isLoading: loadingRequests } = useRequests(buildingId);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!buildingToUse) {
    return <p>Παρακαλώ επιλέξτε κτίριο για να συνεχίσετε.</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.');
      return;
    }

    if (type && !TYPE_CHOICES.some((t) => t.value === type)) {
      setError('Μη έγκυρος τύπος αιτήματος.');
      return;
    }

   setSubmitting(true);
    try {
      await createUserRequest({
        title: title.trim(),
        description: description.trim(),
        building: buildingToUse.id,
        type: type || undefined,
        is_urgent: isUrgent || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['requests', buildingId] });
      router.push('/requests');
    } catch (err: any) {
      const msg = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      setError(`Σφάλμα: ${msg}`);
      console.error('CreateUserRequest failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-20 p-6 bg-white rounded-2xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">Νέο Αίτημα</h1>
      <BuildingFilterIndicator className="mb-4" />
      <p className="text-sm text-muted-foreground mb-4 text-center">
        Κτίριο: <strong>{buildingToUse.name}</strong>
        {selectedBuilding && (
          <span className="block text-xs text-blue-600 mt-1">
            Φιλτράρισμα ενεργό
          </span>
        )}
      </p>

      {error && <ErrorMessage message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? 'Υποβολή…' : 'Δημιουργία Αιτήματος'}
        </button>
      </form>

      <details className="mt-10">
        <summary className="cursor-pointer text-blue-600 underline">
          Προβολή υπαρχόντων αιτημάτων για το κτίριο
        </summary>
        <div className="mt-4">
          {loadingRequests && <RequestSkeleton />}
          {!loadingRequests && requests?.length === 0 && (
            <p className="text-sm text-muted-foreground">Δεν υπάρχουν άλλα αιτήματα.</p>
          )}
          {!loadingRequests &&
            requests?.map((r) => (
              <div key={r.id} className="mb-4 border rounded p-3 shadow-sm">
                <RequestCard request={r} />
                <div className="mt-2 text-right">
                  <SupportButton requestId={r.id} />
                </div>
              </div>
            ))}
        </div>
      </details>
    </div>
  );
}
