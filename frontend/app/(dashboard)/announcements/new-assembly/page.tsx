'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import AssemblyForm from '@/components/AssemblyForm';
import { useEffect, useState } from 'react';

function useSuperUserGuard() {
  const { user, isAuthReady } = useAuth();
  
  return {
    isAccessAllowed: isAuthReady && (user?.is_superuser || user?.is_staff),
    isLoading: !isAuthReady,
  };
}

export default function NewAssemblyPage() {
  const { currentBuilding } = useBuilding();
  const { isAccessAllowed, isLoading } = useSuperUserGuard();
  const [hasShownAuthError, setHasShownAuthError] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAccessAllowed && !hasShownAuthError) {
      console.log('[NewAssemblyPage] User not authenticated, redirecting to login');
      setHasShownAuthError(true);
      
      // Μικρή καθυστέρηση για να προλάβει να εμφανιστεί το toast
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
  }, [isAccessAllowed, isLoading, hasShownAuthError]);

  if (isLoading) return <p className="p-4">Έλεγχος δικαιωμάτων...</p>;
  if (!isAccessAllowed) return <p className="p-4 text-red-600">🚫 Δεν έχετε πρόσβαση σε αυτή τη σελίδα.</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
