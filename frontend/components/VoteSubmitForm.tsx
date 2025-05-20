'use client';

import { useState } from 'react';
import { useSubmitVote } from '@/hooks/useSubmitVote';
import { toast } from 'react-hot-toast';

interface Props {
  voteId: number;
  choices: string[];
  isActive: boolean;
  initialChoice?: string | null;
  onSubmitted?: () => void;
}

export default function VoteSubmitForm({
  voteId,
  choices,
  isActive,
  initialChoice = null,
  onSubmitted,
}: Readonly<Props>) {
  const [selected, setSelected] = useState<string | null>(initialChoice);
  const [error, setError] = useState<string | null>(null);

  const { mutate: submitVote, isPending } = useSubmitVote();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) {
      setError('Παρακαλώ επιλέξτε μία επιλογή.');
      return;
    }

    submitVote(
      { voteId, option: selected },
      {
        onSuccess: () => {
          toast.success('Η ψήφος σας καταχωρήθηκε!');
          if (onSubmitted) onSubmitted();
        },
        onError: () => {
          setError('Αποτυχία υποβολής ψήφου.');
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in">
      {choices.map((c) => (
        <label
          key={c}
          className={`flex items-center gap-2 px-4 py-2 rounded border transition cursor-pointer
            ${selected === c ? 'border-blue-600 bg-blue-100' : 'border-gray-300'}
            ${!isActive ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}
          `}
        >
          <input
            type="radio"
            name="choice"
            value={c}
            checked={selected === c}
            onChange={() => setSelected(c)}
            className="accent-blue-600"
            disabled={!isActive}
          />
          {c}
        </label>
      ))}

      <button
        type="submit"
        disabled={isPending || selected === null || !isActive}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isPending ? 'Υποβολή...' : 'Υποβολή Ψήφου'}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
