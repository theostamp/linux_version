'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import NewAnnouncementForm from '@/components/NewAnnouncementForm';
import { useInternalManagerGuard } from '@/hooks/useInternalManagerGuard';

export default function NewAnnouncementPage() {
  const { currentBuilding } = useBuilding();
  const { isAccessAllowed, isLoading } = useInternalManagerGuard();

  if (isLoading) return <p className="p-4">Έλεγχος δικαιωμάτων...</p>;
  if (!isAccessAllowed) return <p className="p-4 text-red-600">🚫 Δεν έχετε πρόσβαση σε αυτή τη σελίδα.</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">📢 Νέα Ανακοίνωση</h1>
      <BuildingFilterIndicator className="mb-4" />
      <NewAnnouncementForm buildingId={currentBuilding?.id} />
    </div>
  );
}
