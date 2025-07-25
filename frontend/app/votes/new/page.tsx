// frontend/app/votes/new/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { createVote } from '@/lib/api';
import NewVoteForm from '@/components/NewVoteForm';
import { useSuperUserGuard } from '@/hooks/useSuperUserGuard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';

export default function NewVotePage() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const router = useRouter();
  const { isAccessAllowed, isLoading } = useSuperUserGuard();

  const queryClient = useQueryClient();

  if (isLoading) {
    return <p className="p-4">Έλεγχος δικαιωμάτων...</p>;
  }

  if (!isAccessAllowed) {
    return <p className="p-4 text-red-600">🚫 Δεν έχετε πρόσβαση σε αυτή τη σελίδα.</p>;
  }

  if (!currentBuilding && !selectedBuilding) {
    return <p className="p-4">Δεν έχει επιλεγεί κτήριο.</p>;
  }

  const buildingId = selectedBuilding?.id || currentBuilding?.id;

  async function handleSubmit(data: any) {
    try {
      await createVote({ ...data, building: buildingId });
      queryClient.invalidateQueries({ queryKey: ['votes', buildingId] });
      toast.success('Η ψηφοφορία δημιουργήθηκε με επιτυχία');
      router.push('/votes');
    } catch (err: any) {
      toast.error(err.message ?? 'Αποτυχία δημιουργίας ψηφοφορίας');
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href="/votes">
        <Button variant="secondary">⬅ Επιστροφή στις Ψηφοφορίες</Button>
      </Link>

      {/* Προαιρετικά μπορείς να βάλεις τίτλο εδώ */}
      <h1 className="text-2xl font-bold">🗳️ Νέα Ψηφοφορία</h1>
      <BuildingFilterIndicator className="mb-4" />

      <NewVoteForm onSubmit={handleSubmit} buildingId={buildingId} />
    </div>
  );
}