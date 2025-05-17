'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { createVote } from '@/lib/api';
import { toast } from 'react-hot-toast';
import NewVoteForm from '@/components/NewVoteForm';

export default function NewVotePage() {
  const { user, isLoading } = useAuth();
  const { currentBuilding } = useBuilding();
  const router = useRouter();

  useEffect(() => {
    // Adjust the property check according to your actual User type
    if (
      !isLoading &&
      !user?.is_superuser // check only for 'is_superuser'; add other checks if needed
    ) {
      router.push('/unauthorized');
    }
  }, [user, isLoading, router]);

  if (isLoading) return <p>Φόρτωση…</p>;
  if (!currentBuilding) return <p>Δεν έχει επιλεγεί κτήριο.</p>;

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
