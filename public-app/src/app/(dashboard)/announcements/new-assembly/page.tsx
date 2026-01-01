'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import AssemblyForm from '@/components/AssemblyForm';
import { useInternalManagerGuard } from '@/hooks/useInternalManagerGuard';

export default function NewAssemblyPage() {
  const { currentBuilding } = useBuilding();
  const { isAccessAllowed, isLoading } = useInternalManagerGuard();

  if (isLoading) return <p className="p-4">Έλεγχος δικαιωμάτων...</p>;
  if (!isAccessAllowed) return <p className="p-4 text-red-600">🚫 Δεν έχετε πρόσβαση σε αυτή τη σελίδα.</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          🏛️ Νέα Γενική Συνέλευση
        </h1>
        <p className="text-gray-600">
          Δημιουργήστε μια ανακοίνωση για γενική συνέλευση με όλα τα σχετικά θέματα
        </p>
      </div>

      <BuildingFilterIndicator className="mb-6" />

      <AssemblyForm buildingId={currentBuilding?.id} />
    </div>
  );
}
