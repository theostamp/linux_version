'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { fetchRequest, updateUserRequest } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { UserRequest } from '@/types/userRequests';

export default function EditRequestPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestType, setRequestType] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchRequest(Number(id));
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setRequestType(data.type ?? '');
        setIsUrgent(data.is_urgent ?? false);
      } catch (err: unknown) {
        const error = err as { message?: string };
        setError(error.message || 'Αποτυχία φόρτωσης αιτήματος');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await updateUserRequest(Number(id), {
        title: title.trim(),
        description,
        type: requestType || undefined,
        is_urgent: isUrgent,
      });
      toast.success('Το αίτημα ενημερώθηκε επιτυχώς');
      router.push(`/requests/${id}`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Αποτυχία αποθήκευσης');
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-300 rounded w-3/4"></div>
        <div className="h-20 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
    </div>
  );

  if (error) return (
    <div>
      <ErrorMessage message={error} />
      <Link href={`/requests/${id}`}>
        <Button variant="secondary" className="mt-4">⬅ Επιστροφή</Button>
      </Link>
    </div>
  );

  return (
    <div>
      <Link href={`/requests/${id}`}>
        <Button variant="secondary" className="mb-4">⬅ Επιστροφή</Button>
      </Link>

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
          <label htmlFor="type" className="block text-sm font-medium">Τύπος</label>
          <input
            id="type"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div className="flex items-center">
          <input
            id="urgent"
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="h-4 w-4 text-red-600 border-slate-200 rounded"
          />
          <label htmlFor="urgent" className="ml-2 block text-sm text-gray-700">
            Επείγον
          </label>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {saving ? 'Αποθήκευση...' : '💾 Αποθήκευση'}
        </Button>
      </form>
    </div>
  );
}
