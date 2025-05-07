// components/NewAnnouncementForm.tsx
'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  readonly buildingId: number;
  readonly onSuccess?: () => void;
}

export default function NewAnnouncementForm({ buildingId, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/announcements/', {
        title,
        content,
        building: buildingId,     // εδώ περνάμε το required πεδίο
      });
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert('Σφάλμα κατά τη δημιουργία ανακοίνωσης');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Τίτλος"
        required
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Κείμενο"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Δημιουργία...' : 'Δημιουργία Ανακοίνωσης'}
      </button>
    </form>
  );
}
