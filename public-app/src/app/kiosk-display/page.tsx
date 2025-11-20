'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import KioskSceneRenderer from '@/components/KioskSceneRenderer';
import { useBuilding } from '@/components/contexts/BuildingContext';
import type { Building } from '@/lib/api';

const FALLBACK_TIMESTAMP = '1970-01-01T00:00:00.000Z';

const parseBuildingId = (value?: string | null): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

// Force dynamic rendering to avoid SSR issues with useSearchParams
export const dynamic = 'force-dynamic';

function KioskDisplayPageContent() {
  const searchParams = useSearchParams();
  const buildingParam = useMemo(
    () => parseBuildingId(searchParams?.get('building')),
    [searchParams]
  );

  const { selectedBuilding, setSelectedBuilding } = useBuilding();

  // If building is passed via query string, set it in context (minimal stub for kiosk scenes)
  useEffect(() => {
    if (!buildingParam) return;
    if (selectedBuilding?.id === buildingParam) return;

    const stubBuilding: Building = {
      id: buildingParam,
      name: `Κτίριο #${buildingParam}`,
      address: '',
      city: '',
      created_at: FALLBACK_TIMESTAMP,
      updated_at: FALLBACK_TIMESTAMP,
    };

    setSelectedBuilding(stubBuilding);
  }, [buildingParam, selectedBuilding?.id, setSelectedBuilding]);

  const effectiveBuildingId = buildingParam ?? selectedBuilding?.id ?? 1;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <KioskSceneRenderer buildingIdOverride={effectiveBuildingId} />
    </div>
  );
}

// Loading fallback component
function KioskDisplayLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Φόρτωση δεδομένων...</p>
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function KioskDisplayPage() {
  return (
    <Suspense fallback={<KioskDisplayLoading />}>
      <KioskDisplayPageContent />
    </Suspense>
  );
}
