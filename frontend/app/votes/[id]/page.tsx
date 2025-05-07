// frontend/app/votes/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';

interface Vote {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  choices: string[];
}

export default function VoteDetailPage() {
  const { id } = useParams();
  const [vote, setVote] = useState<Vote | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [myChoice, setMyChoice] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchVote() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/votes/${id}/`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Αποτυχία φόρτωσης ψηφοφορίας');
      const data = await res.json();
      setVote({
        ...data,
        choices: ['ΝΑΙ', 'ΟΧΙ', 'ΛΕΥΚΟ'],
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function fetchMyVote() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/votes/${id}/my-submission/`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMyChoice(data.choice);
    } catch {
      setMyChoice(null);
    }
  }

  async function fetchResults() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/votes/${id}/results/`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data);
    } catch {
      setResults(null);
    }
  }

  async function handleVoteSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/votes/${id}/vote/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: selected }),
      });

      if (!res.ok) throw new Error('Αποτυχία υποβολής ψήφου');
      await fetchMyVote();
      await fetchResults();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    fetchVote();
    fetchMyVote();
    fetchResults();
  }, [id]);

  if (error) return <ErrorMessage message={error} />;
  if (!vote) return <p className="p-6">Φόρτωση...</p>;

  const today = new Date().toISOString().split('T')[0];
  const isActive = vote.start_date <= today && today <= vote.end_date;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{vote.title}</h1>
      <p className="text-gray-700">{vote.description}</p>

      <div className="text-sm text-gray-500">
        Έναρξη: {vote.start_date} • Λήξη: {vote.end_date}
      </div>

      {!isActive && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded text-sm">
          ⚠️ Η ψηφοφορία δεν είναι ενεργή ({vote.start_date} – {vote.end_date})
        </div>
      )}

      {myChoice ? (
        <div className="bg-green-100 text-green-800 px-4 py-3 rounded text-sm flex items-center gap-2">
          ✅ Η ψήφος σας: <strong>{myChoice}</strong>
        </div>
      ) : (
        isActive && (
          <div className="space-y-3 animate-fade-in">
            {vote.choices.map((c) => (
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
              onClick={handleVoteSubmit}
              disabled={submitting || selected === null || !isActive}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? 'Υποβολή...' : 'Υποβολή Ψήφου'}
            </button>

            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        )
      )}

      {results && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">📊 Αποτελέσματα</h2>
          <div className="space-y-3">
            {vote.choices.map((c) => {
              const count = results[c] || 0;
              const percent = ((count / (results.total || 1)) * 100).toFixed(1);
              return (
                <div key={c} className="text-sm">
                  <div className="flex justify-between">
                    <span>{c}</span>
                    <span>{count} ψήφοι ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded h-2 mt-1">
                    <div
                      className="h-2 bg-blue-600 rounded transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-gray-500">Σύνολο: {results.total} ψήφοι</p>
          </div>
        </div>
      )}
    </div>
  );
}
