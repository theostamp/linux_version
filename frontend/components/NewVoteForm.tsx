'use client';

import { useState } from 'react';
import { CreateVotePayload } from '@/lib/api';
import { toast } from 'react-hot-toast';

type Props = Readonly<{
  onSubmit: (data: CreateVotePayload) => void;
  buildingId: number;
}>;

export default function NewVoteForm({ onSubmit, buildingId }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [choices, setChoices] = useState<string[]>(['Ναι', 'Όχι', 'Λευκό']);
  const [submitting, setSubmitting] = useState(false);

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const addChoice = () => {
    setChoices([...choices, '']);
  };

const removeChoice = (index: number) => {
  if (choices.length <= 1) {
    toast.error('Πρέπει να υπάρχει τουλάχιστον μία επιλογή');
    return;
  }
  setChoices(choices.filter((_, i) => i !== index));
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const trimmedChoices = choices.map(c => c.trim()).filter(Boolean);

    if (!title.trim() || !description.trim()) {
      toast.error('Ο τίτλος και η περιγραφή είναι υποχρεωτικά');
      setSubmitting(false);
      return;
    }

    if (!startDate) {
      toast.error('Η ημερομηνία έναρξης είναι υποχρεωτική');
      setSubmitting(false);
      return;
    }

    if (trimmedChoices.length < 2) {
      toast.error('Πρέπει να υπάρχουν τουλάχιστον δύο επιλογές');
      setSubmitting(false);
      return;
    }

    const payload: CreateVotePayload = {
      title: title.trim(),
      description: description.trim(),
      start_date: startDate,
      end_date: endDate || undefined,
      choices: trimmedChoices,
      building: buildingId,
    };

    try {
      onSubmit(payload);
    } catch (err) {
      console.error('Vote submission failed:', err);
      toast.error('Αποτυχία υποβολής');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="vote-title" className="block font-medium">Τίτλος</label>
        <input
          id="vote-title"
          className="w-full border rounded px-3 py-2"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="vote-description" className="block font-medium">Περιγραφή</label>
        <textarea
          id="vote-description"
          className="w-full border rounded px-3 py-2"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="vote-start-date" className="block font-medium">Έναρξη</label>
          <input
            id="vote-start-date"
            type="date"
            className="w-full border rounded px-3 py-2"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <label htmlFor="vote-end-date" className="block font-medium">Λήξη (προαιρετικά)</label>
          <input
            id="vote-end-date"
            type="date"
            className="w-full border rounded px-3 py-2"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label
          className="block font-medium mb-2"
          htmlFor="vote-choice-0"
        >
          Επιλογές Ψηφοφορίας
        </label>
        {choices.map((choice, index) => (
          <div key={`${choice}-${index}`} className="flex items-center gap-2 mb-2">
            <input
              id={`vote-choice-${index}`}
              className="flex-1 border rounded px-3 py-2"
              value={choice}
              onChange={(e) => handleChoiceChange(index, e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => removeChoice(index)}
              className="text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addChoice}
          className="text-sm text-blue-600 mt-1"
        >
          + Προσθήκη Επιλογής
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Υποβολή…' : 'Δημιουργία Ψηφοφορίας'}
      </button>
    </form>
  );
}
