'use client';

import { useMemo } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { getActiveBuildingId } from '@/lib/api';

export function useActiveBuildingId(fallback?: number) {
  const { selectedBuilding, currentBuilding } = useBuilding();

  return useMemo(() => {
    return selectedBuilding?.id ?? currentBuilding?.id ?? fallback ?? getActiveBuildingId();
  }, [selectedBuilding?.id, currentBuilding?.id, fallback]);
}
