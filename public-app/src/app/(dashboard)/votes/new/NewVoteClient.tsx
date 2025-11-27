'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { createVote, CreateVotePayload } from '@/lib/api';
import { toast } from 'sonner';

const DEFAULT_CHOICES = ['ΝΑΙ', 'ΟΧΙ', 'ΛΕΥΚΟ'];

export default function NewVoteClient() {
  const router = useRouter();
  const params = useSearchParams();
  const buildingParam = params.get('building');
  const buildingId = buildingParam ? parseInt(buildingParam, 10) : NaN;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [choices] = useState<string[]>(DEFAULT_CHOICES);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(buildingId)) {
      setError('Δεν έχει οριστεί το κτίριο. Επέλεξε κτίριο από το dashboard.');
      return;
    }
    if (!title.trim() || !description.trim() || !startDate) {
      setError('Τίτλος, περιγραφή και ημερομηνία έναρξης είναι υποχρεωτικά.');
      return;
    }
    if (endDate && new Date(endDate) < new Date(startDate)) {
      setError('Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateVotePayload = {
        title: title.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate || undefined,
        choices,
        building: buildingId,
      };
      await createVote(payload);
      toast.success('Η ψηφοφορία δημιουργήθηκε με επιτυχία');
      router.push(`/votes`);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err 
        ? JSON.stringify((err as { response?: { data?: unknown } }).response?.data) 
        : err instanceof Error ? err.message : 'Unknown error';
      setError(`Σφάλμα κατά τη δημιουργία ψηφοφορίας: ${msg}`);
      console.error('CreateVote failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-20 p-6 bg-card rounded-none shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-center">🗳️ Νέα Ψηφοφορία</h1>
      {error && <ErrorMessage message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label htmlFor="start" className="block text-sm font-medium">Έναρξη *</label>
          <input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="mt-1 border p-2 rounded"
          />
        </div>

        <div>
          <label htmlFor="end" className="block text-sm font-medium">Λήξη (προαιρετικό)</label>
          <input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 border p-2 rounded"
          />
        </div>

        <div>
          <label htmlFor="choices" className="block text-sm font-medium">Επιλογές Ψηφοφορίας</label>
          <div id="choices" className="space-x-2">
            {choices.map((choice) => (
              <span key={choice} className="inline-block px-2 py-1 bg-gray-100 rounded-full text-sm">
                {choice}
              </span>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Υποβολή…' : 'Δημιουργία Ψηφοφορίας'}
        </button>
      </form>
    </div>
  );
}

