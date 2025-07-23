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

  useEffect(() => {
    const loadBuildings = async () => {
      if (authLoading || !user) return;

      try {
        setIsLoading(true);
        const data = await fetchBuildings();
        setBuildings(data);
        setCurrentBuilding(data[0] || null);
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
      } finally {
        setIsLoading(false);
      }
    };

    loadBuildings();
  }, [authLoading, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user]);

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
