'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { useAuth } from '@/components/contexts/AuthContext';
import NewAnnouncementForm from '@/components/NewAnnouncementForm';

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
  const { isAccessAllowed, isLoading } = useSuperUserGuard();

  if (isLoading) return <p className="p-4">Έλεγχος δικαιωμάτων...</p>;
  if (!isAccessAllowed) return <p className="p-4 text-red-600">🚫 Δεν έχετε πρόσβαση σε αυτή τη σελίδα.</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">📢 Νέα Ανακοίνωση</h1>
      <BuildingFilterIndicator className="mb-4" />
      <NewAnnouncementForm buildingId={currentBuilding?.id} />
    </div>
  );
}
