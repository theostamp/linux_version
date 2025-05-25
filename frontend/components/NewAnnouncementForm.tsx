'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAnnouncement, CreateAnnouncementPayload } from '@/lib/api';
import { toast } from 'react-hot-toast';

type Props = {
  readonly buildingId: number;
};

export default function NewAnnouncementForm({ buildingId }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true); // ✅ default true
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    if (!title.trim()) {
      toast.error('Ο τίτλος είναι υποχρεωτικός');
      setSubmitting(false);
      return;
    }

    try {
      const payload: CreateAnnouncementPayload = {
        title: title.trim(),
        description: content.trim(),
        start_date: startDate,
        end_date: endDate || '',
        file: undefined, // αν προσθέσεις υποστήριξη για file upload το προσαρμόζεις
        is_active: isActive, // ✅ ΠΡΟΣΘΗΚΗ
        building: buildingId,
      };

      await createAnnouncement(payload);

      toast.success('Η ανακοίνωση δημιουργήθηκε με επιτυχία');
      router.push('/announcements');
    } catch (err) {
      toast.error((err as Error).message || 'Αποτυχία δημιουργίας ανακοίνωσης');
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
        <label htmlFor="content" className="block text-sm font-medium">Περιεχόμενο</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 w-full border rounded-lg px-3 py-2 h-32"
          required
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="start" className="block text-sm font-medium">Έναρξη</label>
          <input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            required
          />
        </div>
        <div className="flex-1">
          <label htmlFor="end" className="block text-sm font-medium">Λήξη</label>
          <input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="file" className="block text-sm font-medium">URL Αρχείου (προαιρετικό)</label>
        <input
          id="file"
          type="url"
          value={fileUrl ?? ''}
          onChange={(e) => setFileUrl(e.target.value || null)}
          className="mt-1 w-full border rounded-lg px-3 py-2"
        />
      </div>

      {/* ✅ ΠΡΟΣΘΗΚΗ CHECKBOX */}
      <div className="flex items-center">
        <input
          id="is_active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 text-green-600 border-gray-300 rounded"
        />
        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
          Ενεργή ανακοίνωση (δημοσιευμένη)
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {submitting ? 'Υποβολή…' : 'Δημιουργία'}
      </button>
    </form>
  );
}
