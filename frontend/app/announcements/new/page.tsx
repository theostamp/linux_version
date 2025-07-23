'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { createAnnouncement } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import NewAnnouncementForm from '@/components/NewAnnouncementForm';

type AnnouncementFormData = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  file?: File | null;
  is_active?: boolean;
};

function useSuperUserGuard() {
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

export default function NewAnnouncementPage() {
  const { currentBuilding } = useBuilding();
  const router = useRouter();
  const { isAccessAllowed, isLoading } = useSuperUserGuard();

  if (isLoading) return <p className="p-4">Έλεγχος δικαιωμάτων...</p>;
  if (!isAccessAllowed) return <p className="p-4 text-red-600">🚫 Δεν έχετε πρόσβαση σε αυτή τη σελίδα.</p>;
  if (!currentBuilding) return <p className="p-4">Δεν έχει επιλεγεί κτήριο.</p>;

  async function handleSubmit({ title, description, start_date, end_date, file, is_active }: AnnouncementFormData) {
    try {
      await createAnnouncement({ title, description, start_date, end_date, file, is_active, building: currentBuilding!.id });
      toast.success('Η ανακοίνωση δημιουργήθηκε με επιτυχία');
      router.push('/announcements');
    } catch (err: any) {
      toast.error(err.message ?? 'Αποτυχία δημιουργίας ανακοίνωσης');
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📢 Νέα Ανακοίνωση</h1>
      <BuildingFilterIndicator className="mb-4" />
      <NewAnnouncementForm buildingId={currentBuilding.id} />
    </div>
  );
}
