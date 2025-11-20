'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import KioskSceneRenderer from '@/components/KioskSceneRenderer';
import { useBuilding } from '@/components/contexts/BuildingContext';
import type { Building } from '@/lib/api';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BuildingSelector from '@/components/BuildingSelector';

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
  const router = useRouter();
  const pathname = usePathname();
  const [isBuildingSelectorOpen, setIsBuildingSelectorOpen] = useState(false);
  const [effectiveBuildingId, setEffectiveBuildingId] = useState<number>(1);

  const buildingParam = useMemo(() => {
    const primary = parseBuildingId(searchParams?.get('building'));
    if (primary !== null) return primary;
    return parseBuildingId(searchParams?.get('building_id'));
  }, [searchParams]);

  const { selectedBuilding, setSelectedBuilding, currentBuilding } = useBuilding();

  // If building is passed via query string, set it in context (minimal stub for kiosk scenes)
  useEffect(() => {
    // keep internal state in sync with URL param
    if (buildingParam) {
      setEffectiveBuildingId(buildingParam);
    }

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

  // Fallback to selectedBuilding when no query param provided
  useEffect(() => {
    if (!buildingParam && selectedBuilding?.id) {
      setEffectiveBuildingId(selectedBuilding.id);
    }
  }, [buildingParam, selectedBuilding?.id]);

  // Keyboard shortcut Ctrl+Alt+B opens selector (kiosk flow)
  useKeyboardShortcuts({
    onBuildingSelector: () => setIsBuildingSelectorOpen(true),
  });

  const handleBuildingSelect = useCallback(
    (building: Building | null) => {
      setSelectedBuilding(building);
      setIsBuildingSelectorOpen(false);
      if (building?.id) {
        setEffectiveBuildingId(building.id);
      }

      const params = new URLSearchParams(searchParams?.toString() || '');
      if (building?.id) {
        params.set('building', String(building.id));
        params.set('building_id', String(building.id));
      } else {
        params.delete('building');
        params.delete('building_id');
      }
      const queryString = params.toString();
      router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
    },
    [pathname, router, searchParams, setSelectedBuilding]
  );

  const handleManualBuildingId = useCallback(
    (id: number) => {
      const stubBuilding: Building = {
        id,
        name: `Κτίριο #${id}`,
        address: '',
        city: '',
        created_at: FALLBACK_TIMESTAMP,
        updated_at: FALLBACK_TIMESTAMP,
      };
      handleBuildingSelect(stubBuilding);
    },
    [handleBuildingSelect]
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <KioskSceneRenderer buildingIdOverride={effectiveBuildingId} allowSceneCreation={false} />
      <BuildingSelector
        isOpen={isBuildingSelectorOpen}
        onClose={() => setIsBuildingSelectorOpen(false)}
        onBuildingSelect={handleBuildingSelect}
        selectedBuilding={selectedBuilding || currentBuilding}
        currentBuilding={selectedBuilding || currentBuilding}
        onManualBuildingSelect={handleManualBuildingId}
      />
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
