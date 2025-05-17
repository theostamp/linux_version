// frontend/app/votes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchVotes } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';

import VoteCard from '@/components/VoteCard';
import ErrorMessage from '@/components/ErrorMessage';

export default function VotesPage() {
  const { currentBuilding } = useBuilding();
  const [votes, setVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadVotes() {
    if (!currentBuilding?.id) return;
    try {
      const data = await fetchVotes(currentBuilding.id);
      setVotes(data);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVotes();
  }, [currentBuilding?.id]);

  let content;
  if (loading) {
    content = <p className="text-gray-500">Φόρτωση...</p>;
  } else if (error) {
    content = <ErrorMessage message="Αδυναμία φόρτωσης ψηφοφοριών." />;
  } else if (votes.length > 0) {
    content = (
      <div className="grid grid-cols-1 gap-4">
        {votes.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
      </div>
    );
  } else {
    content = (
      <div className="text-gray-500 text-center">Δεν υπάρχουν ενεργές ψηφοφορίες.</div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🗳️ Ενεργές Ψηφοφορίες</h1>
      {content}
    </div>
  );
}
