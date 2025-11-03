// frontend/app/requests/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';

export default function EditRequestPage() {
  const { id } = useParams();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestType, setRequestType] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user-requests/${id}/`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Αποτυχία φόρτωσης αιτήματος');
        const data = await res.json();
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setRequestType(data.type ?? '');
        setIsUrgent(data.is_urgent ?? false);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user-requests/${id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description,
          type: requestType || null,
          is_urgent: isUrgent,
        }),
      });

      if (!res.ok) throw new Error('Αποτυχία αποθήκευσης');
      router.push(`/requests/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6">Φόρτωση...</p>;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">✏️ Επεξεργασία Αιτήματος</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">Τίτλος</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">Περιγραφή</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2 h-32"
            required
          />
        </div>

        <div>
          <label htmlFor="requestType" className="block text-sm font-medium">Τύπος Αιτήματος</label>
          <select
            id="requestType"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          >
            <option value="">-- Επιλέξτε τύπο --</option>
            <option value="maintenance">Συντήρηση</option>
            <option value="cleaning">Καθαριότητα</option>
            <option value="technical">Τεχνικό</option>
            <option value="other">Άλλο</option>
          </select>
        </div>

        <div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="accent-red-600"
            />{' '}
            Επείγον αίτημα
          </label>
        </div>

        {error && <ErrorMessage message={error} />}

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Αποθήκευση Αλλαγών
        </button>
      </form>
    </div>
  );
}
