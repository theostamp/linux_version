// frontend/contexts/BuildingContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { fetchBuildings, Building } from '@/lib/api';

type BuildingContextType = {
  buildings: Building[];
  currentBuilding: Building | null;
  setCurrentBuilding: (b: Building) => void;
};

const BuildingContext = createContext<BuildingContextType | undefined>(undefined);

export function BuildingProvider({ children }: { children: ReactNode }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);

  // Φόρτωση όλων των κτιρίων μια φορά στην init
  useEffect(() => {
    fetchBuildings()
      .then((list) => {
        setBuildings(list);
        // Αν δεν έχουμε ήδη currentBuilding, βάζουμε το πρώτο
        if (!currentBuilding && list.length > 0) {
          setCurrentBuilding(list[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch buildings', err);
      });
  }, []);

  // Αποθήκευση στο localStorage
  useEffect(() => {
    if (currentBuilding) {
      localStorage.setItem('currentBuilding', JSON.stringify(currentBuilding));
    }
  }, [currentBuilding]);

  return (
    <BuildingContext.Provider value={{ buildings, currentBuilding, setCurrentBuilding }}>
      {children}
    </BuildingContext.Provider>
  );
}

export function useBuilding() {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error('useBuilding must be inside BuildingProvider');
  return ctx;
}
