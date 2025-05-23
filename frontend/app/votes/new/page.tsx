'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { createVote } from '@/lib/api';
import NewVoteForm from '@/components/NewVoteForm';
import { useAuth } from '@/components/contexts/AuthContext';

export function useSuperUserGuard() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user?.is_superuser && !user?.is_staff) {
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router]);

  return {
    isAccessAllowed: isAuthReady && (user?.is_superuser || user?.is_staff),
    isLoading: !isAuthReady,
  };
}

export default function NewVotePage() {
  const { currentBuilding } = useBuilding();
  const router = useRouter();
  const { isAccessAllowed, isLoading } = useSuperUserGuard();

  if (isLoading) return <p className="p-4">Έλεγχος δικαιωμάτων...</p>;
  if (!isAccessAllowed) return <p className="p-4 text-red-600">🚫 Δεν έχετε πρόσβαση σε αυτή τη σελίδα.</p>;
  if (!currentBuilding) return <p className="p-4">Δεν έχει επιλεγεί κτήριο.</p>;

  async function handleSubmit(data: any) {
    try {
      await createVote(data);
      toast.success('Η ψηφοφορία δημιουργήθηκε με επιτυχία');
      router.push('/votes');
    } catch (err: any) {
      toast.error(err.message ?? 'Αποτυχία δημιουργίας ψηφοφορίας');
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🗳️ Νέα Ψηφοφορία</h1>
      <NewVoteForm onSubmit={handleSubmit} buildingId={currentBuilding.id} />
    </div>
  );
}