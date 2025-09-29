'use client';

import { ReactNode } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';

interface BuildingGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function BuildingGuard({ children, fallback }: Readonly<BuildingGuardProps>) {
  const { currentBuilding, isLoading } = useBuilding();

  if (isLoading) {
    return <p className="p-6">Φόρτωση κτηρίου...</p>;
  }

  if (!currentBuilding) {
    return fallback ?? <p className="p-6 text-red-600">Δεν έχει επιλεγεί κτήριο.</p>;
  }

  return <>{children}</>;
}
