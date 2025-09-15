// ✅ frontend/components/VoteCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { submitVote, fetchMyVote, deleteVote } from '@/lib/api';
import VoteResults from './VoteResults';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { isValidDate, safeFormatDate } from '@/lib/utils';

type Vote = {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  building_name: string;
  total_votes?: number; // Total number of votes cast
};

export default function VoteCard({ vote }: { readonly vote: Vote }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [userChoice, setUserChoice] = useState<"ΝΑΙ" | "ΟΧΙ" | "ΛΕΥΚΟ" | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const today = new Date();
  const isActive =
    isValidDate(vote.start_date) && isValidDate(vote.end_date) &&
    new Date(vote.start_date) <= today && today <= new Date(vote.end_date);

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

  async function handleVote(choice: "ΝΑΙ" | "ΟΧΙ" | "ΛΕΥΚΟ") {
    setLoading(true);
    setError('');

    try {
      await submitVote(vote.id, choice);
      setUserChoice(choice);
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    const isGlobal = vote.building_name === "Όλα τα κτίρια";
    const confirmMessage = isGlobal 
      ? `Είστε σίγουροι ότι θέλετε να διαγράψετε την ΚΑΘΟΛΙΚΗ ψηφοφορία "${vote.title}" από όλα τα κτίρια;`
      : `Είστε σίγουροι ότι θέλετε να διαγράψετε τη ψηφοφορία "${vote.title}";`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const message = await deleteVote(vote.id);
      toast.success(message);
      // Invalidate the votes query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['votes'] });
    } catch (error) {
      console.error('Error deleting vote:', error);
      toast.error('Σφάλμα κατά τη διαγραφή της ψηφοφορίας');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (iso: string) =>
    safeFormatDate(iso, 'dd/MM/yyyy');

  // Show delete button only for superusers and managers
  const canDelete = user?.is_superuser || user?.is_staff;

  return (
    <div className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800 mb-4 relative">
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
          title="Διαγραφή ψηφοφορίας"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      
      <h2 className="text-xl font-bold text-gray-900 dark:text-white pr-10">{vote.title}</h2>
      <p className="text-gray-700 dark:text-gray-300 mt-2">{vote.description}</p>

      <div className="mt-4">
        {(() => {
          if (userChoice) {
            return (
              <>
                <p className="text-green-600 font-semibold">✅ Η ψήφος σας: {userChoice}</p>
                <VoteResults voteId={vote.id} />
              </>
            );
          } else if (isActive) {
            return (
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
            );
          } else {
            return (
              <p className="text-yellow-600 font-semibold">
                ⚠️ Η ψηφοφορία δεν είναι διαθέσιμη αυτή τη στιγμή.
              </p>
            );
          }
        })()}

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Από {formatDate(vote.start_date)} έως {formatDate(vote.end_date)}
      </div>
    </div>
  );
}