'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { createVote, CreateVotePayload } from '@/lib/api';
import NewVoteForm from '@/components/NewVoteForm';
import { useInternalManagerGuard } from '@/hooks/useInternalManagerGuard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';

export default function NewVotePage() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const router = useRouter();
  const { isAccessAllowed, isLoading } = useInternalManagerGuard();
  const queryClient = useQueryClient();

  const buildingId = selectedBuilding?.id || currentBuilding?.id;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (isLoading) {
    return <p className="p-4">Έλεγχος δικαιωμάτων...</p>;
  }

  if (!isAccessAllowed) {
    return <p className="p-4 text-red-600">🚫 Δεν έχετε πρόσβαση σε αυτή τη σελίδα.</p>;
  }

  async function handleSubmit(data: CreateVotePayload) {
    // Προστασία από double submission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createVote(data);
      // ✅ Invalidate όλα τα votes queries (με prefix matching)
      await queryClient.invalidateQueries({ queryKey: ['votes'], exact: false });
      // ✅ Refetch το συγκεκριμένο query για το τρέχον buildingId
      if (buildingId) {
        await queryClient.refetchQueries({ queryKey: ['votes', buildingId] });
      } else {
        // Αν δεν υπάρχει buildingId, refetch όλα
        await queryClient.refetchQueries({ queryKey: ['votes'], exact: false });
      }
      toast.success('Η ψηφοφορία δημιουργήθηκε με επιτυχία');
      // Μικρή καθυστέρηση για να προλάβει το refetch
      await new Promise(resolve => setTimeout(resolve, 100));
      router.push('/votes');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Αποτυχία δημιουργίας ψηφοφορίας';
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/votes">
        <Button variant="secondary">⬅ Επιστροφή στις Ψηφοφορίες</Button>
      </Link>

      <h1 className="text-2xl font-bold">🗳️ Νέα Ψηφοφορία</h1>
      <BuildingFilterIndicator className="mb-4" />

      <NewVoteForm onSubmit={handleSubmit} buildingId={buildingId} isSubmitting={isSubmitting} />
    </div>
  );
}
