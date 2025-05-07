'use client';

import { useState, useEffect } from 'react';
import { submitVote, fetchMyVote, fetchVoteResults } from '@/lib/api';
import VoteResults from './VoteResults';

type Vote = {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
};

type VoteResultsData = {
  ΝΑΙ: number;
  ΟΧΙ: number;
  ΛΕΥΚΟ: number;
  total: number;
};

export default function VoteCard({ vote }: { readonly vote: Vote }) {
  const [userChoice, setUserChoice] = useState<"ΝΑΙ" | "ΟΧΙ" | "ΛΕΥΚΟ" | null>(null);
  const [results, setResults] = useState<VoteResultsData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const isActive =
    new Date(vote.start_date) <= today && today <= new Date(vote.end_date);

  // Φόρτωση ψήφου χρήστη
  useEffect(() => {
    fetchMyVote(vote.id)
      .then((data) => {
        if (data?.choice === 'ΝΑΙ' || data?.choice === 'ΟΧΙ' || data?.choice === 'ΛΕΥΚΟ') {
          setUserChoice(data.choice);
        }
      })
      .catch((err) => {
        console.error('Σφάλμα κατά τη λήψη ψήφου:', err);
      });
  }, [vote.id]);

  // Φόρτωση αποτελεσμάτων αν υπάρχει ψήφος
  useEffect(() => {
    if (userChoice) {
      fetchVoteResults(vote.id)
        .then((data) => setResults(data))
        .catch((err) => console.error('Σφάλμα κατά τη λήψη αποτελεσμάτων:', err));
    }
  }, [userChoice, vote.id]);

  async function handleVote(choice: "ΝΑΙ" | "ΟΧΙ" | "ΛΕΥΚΟ") {
    setLoading(true);
    setError('');

    try {
      await submitVote(vote.id, choice);
      setUserChoice(choice); // ενημερώνουμε την ψήφο
    } catch (err) {
      if (err instanceof Error) {
        setError(`Αποτυχία υποβολής: ${err.message}`);
      } else {
        setError('Αποτυχία υποβολής. Δοκιμάστε ξανά.');
      }
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800 mb-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{vote.title}</h2>
      <p className="text-gray-700 dark:text-gray-300 mt-2">{vote.description}</p>

      <div className="mt-4">
        {userChoice ? (
          <>
            <p className="text-green-600 font-semibold">✅ Η ψήφος σας: {userChoice}</p>
            {results && <VoteResults results={results} />}
          </>
        ) : isActive ? (
          <div className="flex gap-4">
            <button
              onClick={() => handleVote('ΝΑΙ')}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 disabled:opacity-50"
            >
              ✅ ΝΑΙ
            </button>
            <button
              onClick={() => handleVote('ΟΧΙ')}
              disabled={loading}
              className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 disabled:opacity-50"
            >
              ❌ ΟΧΙ
            </button>
            <button
              onClick={() => handleVote('ΛΕΥΚΟ')}
              disabled={loading}
              className="bg-gray-400 text-white px-4 py-2 rounded-xl hover:bg-gray-500 disabled:opacity-50"
            >
              ⚪ ΛΕΥΚΟ
            </button>
          </div>
        ) : (
          <p className="text-yellow-600 font-semibold">
            ⚠️ Η ψηφοφορία δεν είναι διαθέσιμη αυτή τη στιγμή.
          </p>
        )}

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Από {formatDate(vote.start_date)} έως {formatDate(vote.end_date)}
      </div>
    </div>
  );
}
