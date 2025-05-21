// frontend/app/votes/page.tsx
'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useVotes } from '@/hooks/useVotes';
import VoteStatus from '@/components/VoteStatus';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';

function isActive(start: string, end: string) {
  const today = new Date().toISOString().split('T')[0];
  return start <= today && today <= end;
}

export default function VotesPage() {
  const { currentBuilding, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady } = useAuth(); 

  if (!isAuthReady || buildingLoading || !currentBuilding) {
    return <p className="p-6">Φόρτωση ψηφοφοριών...</p>;
  }

  const {
    data: votes = [],
    isLoading,
    isError,
  } = useVotes(currentBuilding.id);

  if (isLoading) {
    return <p className="p-6">Φόρτωση ψηφοφοριών...</p>;
  }

  if (isError) {
    return <ErrorMessage message="Αδυναμία φόρτωσης ψηφοφοριών για το επιλεγμένο κτήριο." />;
  }

  if (votes.length === 0) {
    return <p className="p-6 text-gray-500">Δεν υπάρχουν διαθέσιμες ψηφοφορίες.</p>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🗳️ Ψηφοφορίες</h1>

      {votes.map((vote: any) => {
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
