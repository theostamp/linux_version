'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { Building } from '@/lib/api';
import { fetchAllBuildings } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface BuildingContextType {
  buildings: Building[];
  currentBuilding: Building | null;
  selectedBuilding: Building | null; // Για φιλτράρισμα - μπορεί να είναι null για "όλα"
  setCurrentBuilding: (building: Building | null) => void;
  setSelectedBuilding: (building: Building | null) => void; // Για φιλτράρισμα
  setBuildings: React.Dispatch<React.SetStateAction<Building[]>>;
  refreshBuildings: () => Promise<void>; // Νέα συνάρτηση για refresh
  isLoading: boolean;
  error: string | null;
}

const BuildingContext = createContext<BuildingContextType>({
  buildings: [],
  currentBuilding: null,
  selectedBuilding: null,
  setCurrentBuilding: () => {},
  setSelectedBuilding: () => {},
  setBuildings: () => {},
  refreshBuildings: async () => {},
  isLoading: false,
  error: null,
});

// Helper functions for localStorage
const getStoredSelectedBuildingId = (): number | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('selectedBuildingId');
  return stored ? parseInt(stored, 10) : null;
};

const setStoredSelectedBuildingId = (buildingId: number | null): void => {
  if (typeof window === 'undefined') return;
  if (buildingId === null) {
    localStorage.removeItem('selectedBuildingId');
  } else {
    localStorage.setItem('selectedBuildingId', buildingId.toString());
  }
};

export const BuildingProvider = ({ children }: { children: ReactNode }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null); // Για φιλτράρισμα
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  const { isLoading: authLoading, user } = useAuth();
  const router = useRouter();

  // Load buildings function - wrapped with useCallback to prevent unnecessary re-renders
  const loadBuildings = useCallback(async () => {
    if (authLoading || !user || isLoadingBuildings || buildings.length > 0 || hasInitialized) return;

    try {
      setIsLoading(true);
      setIsLoadingBuildings(true);
      // For now, use fetchAllBuildings to maintain backward compatibility
      // Later we can implement pagination in the UI
      const data = await fetchAllBuildings();
      console.log('[BuildingContext] Loaded buildings:', data);
      setBuildings(data);
      
      // Restore selected building from localStorage or default to first building
      const storedBuildingId = getStoredSelectedBuildingId();
      let buildingToSelect: Building | null = null;
      
      if (storedBuildingId && data.length > 0) {
        // Try to find the stored building
        buildingToSelect = data.find(building => building.id === storedBuildingId) || null;
      }
      
      // If stored building not found, default to first building
      if (!buildingToSelect && data.length > 0) {
        buildingToSelect = data[0];
      }
      
      setCurrentBuilding(buildingToSelect);
      setSelectedBuilding(buildingToSelect);
      
      // Update localStorage with the selected building
      if (buildingToSelect) {
        setStoredSelectedBuildingId(buildingToSelect.id);
      }
      
      setError(null);
      setHasInitialized(true);
    } catch (err: unknown) {
      console.error('[BuildingContext] Failed to load buildings:', err);

      const apiError = err as { status?: number; response?: { status?: number }; message?: string };
      if (apiError?.status === 403 || apiError?.response?.status === 403) {
        toast.error("Δεν έχετε δικαίωμα πρόσβασης στα κτίρια. Επικοινωνήστε με τον διαχειριστή.");
      } else if (apiError?.status === 429 || apiError?.response?.status === 429) {
        toast.error("Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε λίγο και δοκιμάστε ξανά.");
      } else {
        toast.error("Αποτυχία φόρτωσης κτιρίων.");
      }
      setError(apiError?.message ?? 'Αποτυχία φόρτωσης κτιρίων');
      setBuildings([]);
      setCurrentBuilding(null);
      setSelectedBuilding(null);
      // Clear stored building ID on error
      setStoredSelectedBuildingId(null);
    } finally {
      setIsLoading(false);
      setIsLoadingBuildings(false);
    }
  }, [authLoading, user, isLoadingBuildings, buildings.length, hasInitialized]);

  // Refresh buildings function
  const refreshBuildings = useCallback(async () => {
    console.log('[BuildingContext] Refreshing buildings...');
    await loadBuildings();
  }, [loadBuildings]);

  // Custom setSelectedBuilding that also updates localStorage
  const setSelectedBuildingWithStorage = useCallback((building: Building | null) => {
    setSelectedBuilding(building);
    setStoredSelectedBuildingId(building?.id || null);
  }, [setSelectedBuilding]);

  // Load buildings on mount - only once when auth is ready and user is authenticated AND has a tenant
  useEffect(() => {
    // Only load buildings when auth is not loading, user is authenticated, and has a tenant
    if (!authLoading && user && user.tenant) {
      loadBuildings();
    }
  }, [authLoading, user, loadBuildings]);

  // Keep currentBuilding in sync with selectedBuilding
  useEffect(() => {
    if (selectedBuilding) {
      setCurrentBuilding(selectedBuilding);
    } else if (buildings.length > 0) {
      setCurrentBuilding(buildings[0]);
    }
  }, [selectedBuilding, buildings]);

  useEffect(() => {
    if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    // Μόνο αν υπάρχει σοβαρό error (όχι απλά empty buildings list) κάνουμε redirect
    if (!isLoading && error && error.includes('403')) {
      console.log('[BuildingContext] 403 error detected, redirecting to login');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('selectedBuildingId');
      }
      router.push('/login');
    }
  }, [isLoading, error, router]);

  const contextValue = React.useMemo(
    () => ({
      buildings,
      currentBuilding,
      selectedBuilding,
      setCurrentBuilding,
      setSelectedBuilding: setSelectedBuildingWithStorage, // Use the custom function
      setBuildings,
      refreshBuildings,
      isLoading,
      error,
    }),
    [buildings, currentBuilding, selectedBuilding, setCurrentBuilding, setSelectedBuildingWithStorage, setBuildings, refreshBuildings, isLoading, error]
  );

  return (
    <BuildingContext.Provider value={contextValue}>
      {children}
    </BuildingContext.Provider>
  );
};

export const useBuilding = (): BuildingContextType => {
  return useContext(BuildingContext);
};

