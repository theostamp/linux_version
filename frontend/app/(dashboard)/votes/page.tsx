'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useVotes } from '@/hooks/useVotes';
import VoteStatus from '@/components/VoteStatus';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import type { Vote } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteVote } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

function isActive(start: string, end: string) {
  const today = new Date().toISOString().split('T')[0];
  return start <= today && today <= end;
}

function VotesPageContent() {
  const { currentBuilding, selectedBuilding, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady, user } = useAuth();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Χρησιμοποιούμε το selectedBuilding για φιλτράρισμα
  // Αν είναι null, σημαίνει "όλα τα κτίρια" και περνάμε null στο API
  const buildingId = selectedBuilding?.id ?? null;
  const isManager = user?.profile?.role === 'manager' || user?.is_superuser || user?.is_staff;
  const canDelete = user?.is_superuser || user?.is_staff;
  const canCreateVote = user?.is_superuser || user?.is_staff || user?.profile?.role === 'manager';

  // 💡 Προσοχή: το useVotes καλείται *πάντα*, ανεξάρτητα από loading states
  const {
    data: votes = [],
    isLoading,
    isError,
    isSuccess,
  } = useVotes(buildingId);

  if (!isAuthReady || buildingLoading || isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🗳️ Ψηφοφορίες</h1>
        <BuildingFilterIndicator className="mb-4" />
        <p>Φόρτωση ψηφοφοριών...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🗳️ Ψηφοφορίες</h1>
        <BuildingFilterIndicator className="mb-4" />
        <ErrorMessage message="Αδυναμία φόρτωσης ψηφοφοριών." />
      </div>
    );
  }

  const handleDelete = async (vote: Vote) => {
    const isGlobal = vote.building_name === "Όλα τα κτίρια";
    const confirmMessage = isGlobal 
      ? `Είστε σίγουροι ότι θέλετε να διαγράψετε την ΚΑΘΟΛΙΚΗ ψηφοφορία "${vote.title}" από όλα τα κτίρια;`
      : `Είστε σίγουροι ότι θέλετε να διαγράψετε τη ψηφοφορία "${vote.title}";`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setDeletingId(vote.id);
    try {
      const message = await deleteVote(vote.id);
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['votes'] });
    } catch (error) {
      console.error('Error deleting vote:', error);
      toast.error('Σφάλμα κατά τη διαγραφή της ψηφοφορίας');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🗳️ Ψηφοφορίες</h1>
        {canCreateVote && (
          <Link href="/votes/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              ➕ Νέα Ψηφοφορία
            </Button>
          </Link>
        )}
      </div>

      <BuildingFilterIndicator />

      {isSuccess && votes.length === 0 && (
        <div className="text-center text-gray-500 space-y-2">
          <p>Δεν υπάρχουν διαθέσιμες ψηφοφορίες.</p>
          {canCreateVote && (
            <p className="text-sm text-gray-400">
              Δημιουργήστε την πρώτη ψηφοφορία για να ξεκινήσετε.
            </p>
          )}
        </div>
      )}

      {votes.map((vote: Vote) => {
        const active = isActive(vote.start_date, vote.end_date);
        return (
          <div
            key={vote.id}
            className="p-4 border rounded-lg shadow-sm bg-white space-y-1 relative"
          >
            {/* Building badge - show only when viewing all buildings */}
            {!selectedBuilding && vote.building_name && (
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium shadow-sm">
                  🏢 {vote.building_name}
                </span>
              </div>
            )}
            
            {canDelete && (
              <button
                onClick={() => handleDelete(vote)}
                disabled={deletingId === vote.id}
                className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 z-10"
                title="Διαγραφή ψηφοφορίας"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className={`${!selectedBuilding && vote.building_name ? 'pt-8' : ''}`}>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-800 pr-10">{vote.title}</h2>
              <p className="text-sm text-gray-600">{vote.description}</p>
              <p className="text-xs text-gray-500">
                Έναρξη: {vote.start_date} • Λήξη: {vote.end_date}
              </p>

              <VoteStatus voteId={vote.id} isActive={active} />
            </div>
          </div>
        );
      })}
      
      {/* Floating Action Button for mobile/better UX */}
      {canCreateVote && (
        <Link 
          href="/votes/new"
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="Νέα Ψηφοφορία"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      )}
    </div>
  );
}

export default function VotesPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <VotesPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}
