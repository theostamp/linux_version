'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { fetchBuildings, Building } from '@/lib/api';
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
  isLoading: false,
  error: null,
});

export const BuildingProvider = ({ children }: { children: ReactNode }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null); // Για φιλτράρισμα
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { isLoading: authLoading, user } = useAuth();
  const router = useRouter();

  // Load buildings on mount
  useEffect(() => {
    const loadBuildings = async () => {
      if (authLoading || !user) return;

      try {
        setIsLoading(true);
        const data = await fetchBuildings();
        setBuildings(data);
        // Set both current and selected building to the first one
        const firstBuilding = data[0] || null;
        setCurrentBuilding(firstBuilding);
        setSelectedBuilding(firstBuilding);
        setError(null);
      } catch (err: any) {
        console.error('[BuildingContext] Failed to load buildings:', err);

        if (err?.response?.status === 403) {
          toast.error("Δεν έχετε δικαίωμα πρόσβασης στα κτίρια. Επικοινωνήστε με τον διαχειριστή.");
        } else {
          toast.error("Αποτυχία φόρτωσης κτιρίων.");
        }
        setError(err?.message ?? 'Αποτυχία φόρτωσης κτιρίων');
        setBuildings([]);
        setCurrentBuilding(null);
        setSelectedBuilding(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadBuildings();
  }, [authLoading, user]);

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
    if (!isLoading && (error || buildings.length === 0)) {
      // Καθαρίζουμε τα tokens και κάνουμε redirect στο login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
      }
      router.push('/login');
    }
  }, [isLoading, error, buildings, router]);

  const contextValue = React.useMemo(
    () => ({
      buildings,
      currentBuilding,
      selectedBuilding,
      setCurrentBuilding,
      setSelectedBuilding,
      setBuildings,
      isLoading,
      error,
    }),
    [buildings, currentBuilding, selectedBuilding, setCurrentBuilding, setSelectedBuilding, setBuildings, isLoading, error]
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
