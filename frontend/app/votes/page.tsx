'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useVotes } from '@/hooks/useVotes';
import VoteStatus from '@/components/VoteStatus';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import type { Vote } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function isActive(start: string, end: string) {
  const today = new Date().toISOString().split('T')[0];
  return start <= today && today <= end;
}

export default function VotesPage() {
  const { currentBuilding, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady, user } = useAuth();

  const buildingId = currentBuilding?.id;
  const isManager = user?.profile?.role === 'manager' || user?.is_superuser;

  // 💡 Προσοχή: το useVotes καλείται *πάντα*, ανεξάρτητα από loading states
  const {
    data: votes = [],
    isLoading,
    isError,
    isSuccess,
  } = useVotes(buildingId);

  if (!isAuthReady || buildingLoading || !buildingId || isLoading) {
    return <p className="p-6">Φόρτωση ψηφοφοριών...</p>;
  }

  if (isError) {
    return <ErrorMessage message="Αδυναμία φόρτωσης ψηφοφοριών." />;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🗳️ Ψηφοφορίες</h1>
        {isManager && (
          <Link href="/votes/new">
            <Button>➕ Νέα Ψηφοφορία</Button>
          </Link>
        )}
      </div>

      {isSuccess && votes.length === 0 && (
        <div className="text-center text-gray-500 space-y-2">
          <p>Δεν υπάρχουν διαθέσιμες ψηφοφορίες.</p>
          {isManager && (
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
            className="p-4 border rounded-lg shadow-sm bg-white space-y-1"
          >
            <h2 className="text-lg font-semibold text-blue-700">{vote.title}</h2>
            <p className="text-sm text-gray-600">{vote.description}</p>
            <p className="text-xs text-gray-500">
              Έναρξη: {vote.start_date} • Λήξη: {vote.end_date}
            </p>

            <VoteStatus voteId={vote.id} isActive={active} />
          </div>
        );
      })}
    </div>
  );
}
