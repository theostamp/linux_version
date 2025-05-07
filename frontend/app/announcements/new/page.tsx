'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { createAnnouncement } from '@/lib/api';  // ✅ helper με csrfFetch

export default function NewAnnouncementPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!title.trim()) {
      setError('Ο τίτλος είναι υποχρεωτικός');
      setSubmitting(false);
      return;
    }

    try {
      await createAnnouncement({
        title: title.trim(),
        description: content.trim(),
        start_date: startDate,
        end_date: endDate,
        file: fileUrl,
      });

      router.push('/announcements');
    } catch (err) {
      setError((err as Error).message || 'Αποτυχία δημιουργίας ανακοίνωσης');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">➕ Νέα Ανακοίνωση</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Τίτλος
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium">
            Περιεχόμενο
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2 h-32"
            required
          />
        </div>

        <div>
          <label htmlFor="start" className="block text-sm font-medium">
            Έναρξη
          </label>
          <input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="end" className="block text-sm font-medium">
            Λήξη
          </label>
          <input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium">
            URL Αρχείου (προαιρετικό)
          </label>
          <input
            id="file"
            type="url"
            value={fileUrl ?? ''}
            onChange={(e) => setFileUrl(e.target.value || null)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </div>

        {error && <ErrorMessage message={error} />}

        <button
          type="submit"
          disabled={submitting}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? 'Υποβολή…' : 'Δημιουργία'}
        </button>
      </form>
    </div>
  );
}
