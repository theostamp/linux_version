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

interface BuildingContextType {
  buildings: Building[];
  currentBuilding: Building | null;
  setCurrentBuilding: (building: Building | null) => void;
  setBuildings: React.Dispatch<React.SetStateAction<Building[]>>; // ✅ Προστέθηκε
  isLoading: boolean;
  error: string | null;
}

const BuildingContext = createContext<BuildingContextType>({
  buildings: [],
  currentBuilding: null,
  setCurrentBuilding: () => {},
  setBuildings: () => {}, // ✅ Προστέθηκε
  isLoading: false,
  error: null,
});

export const BuildingProvider = ({ children }: { children: ReactNode }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
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
        if (data.length > 0) {
          setCurrentBuilding(data[0]);
        }
        setError(null);
      } catch (err: any) {
        console.error('[BuildingContext] Failed to load buildings:', err);
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
      setCurrentBuilding,
      setBuildings, // ✅ Προστέθηκε
      isLoading,
      error,
    }),
    [buildings, currentBuilding, setCurrentBuilding, setBuildings, isLoading, error]
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
