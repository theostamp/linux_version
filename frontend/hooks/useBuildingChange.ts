import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface UseBuildingChangeOptions {
  onBuildingChange?: (buildingId: number | null) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

export function useBuildingChange(options: UseBuildingChangeOptions = {}) {
  const [isChangingBuilding, setIsChangingBuilding] = useState(false);
  const [lastChangedBuilding, setLastChangedBuilding] = useState<number | null>(null);

  const changeBuilding = useCallback(async (buildingId: number | null) => {
    setIsChangingBuilding(true);
    
    try {
      // Update URL
      const url = new URL(window.location.href);
      if (buildingId === null) {
        url.searchParams.delete('building');
      } else {
        url.searchParams.set('building', buildingId.toString());
      }
      window.history.pushState({}, '', url.toString());
      
      // Call the provided callback
      if (options.onBuildingChange) {
        options.onBuildingChange(buildingId);
      }
      
      setLastChangedBuilding(buildingId);
      
      // Show success toast if enabled
      if (options.showToast !== false) {
        if (buildingId === null) {
          toast.success('Επιλέχθηκε: Όλα τα κτίρια', {
            duration: 2000,
            position: 'top-right',
          });
        } else {
          toast.success('Κτίριο αλλάχθηκε επιτυχώς', {
            duration: 2000,
            position: 'top-right',
          });
        }
      }
      
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error('Error changing building:', error);
      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
      
      // Show error toast
      if (options.showToast !== false) {
        toast.error('Σφάλμα κατά την αλλαγή κτιρίου', {
          duration: 3000,
          position: 'top-right',
        });
      }
    } finally {
      setIsChangingBuilding(false);
    }
  }, [options]);

  return {
    isChangingBuilding,
    lastChangedBuilding,
    changeBuilding,
  };
} 