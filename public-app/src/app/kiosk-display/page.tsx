'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Monitor } from 'lucide-react';
import KioskSceneRenderer from '@/components/KioskSceneRenderer';
import { useBuilding } from '@/components/contexts/BuildingContext';
import type { Building } from '@/lib/api';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useKioskData } from '@/hooks/useKioskData';
import BuildingSelector from '@/components/BuildingSelector';
import PremiumFeatureInfo from '@/components/premium/PremiumFeatureInfo';

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

  // Track if we have a URL parameter - this takes absolute priority
  const hasUrlParam = useRef<boolean>(false);
  // Track the last building ID we set to avoid infinite loops
  const lastSetBuildingId = useRef<number | null>(null);

  const buildingParam = useMemo(() => {
    const fromBuildingId = parseBuildingId(searchParams?.get('building_id'));
    if (fromBuildingId !== null) return fromBuildingId;
    return parseBuildingId(searchParams?.get('building'));
  }, [searchParams]);

  const { selectedBuilding, setSelectedBuilding, currentBuilding } = useBuilding();

  // Fetch kiosk data to get real building info
  const { data: kioskData } = useKioskData(effectiveBuildingId ?? 1);

  // Effect 1: Handle URL parameter changes (highest priority)
  // URL parameter ALWAYS overrides context - this prevents BuildingContext from resetting the building
  useEffect(() => {
    console.log('[KioskDisplay] 🔍 URL buildingParam:', buildingParam);

    if (buildingParam !== null) {
      hasUrlParam.current = true;
      setEffectiveBuildingId(buildingParam);

      console.log(`[KioskDisplay] ✅ Setting effectiveBuildingId from URL: ${buildingParam}`);

      // Only update context if it's different from what we last set
      // This prevents infinite loops
      if (lastSetBuildingId.current !== buildingParam) {
        lastSetBuildingId.current = buildingParam;
        const stubBuilding: Building = {
          id: buildingParam,
          name: `Κτίριο #${buildingParam}`,
          address: '',
          city: '',
          created_at: FALLBACK_TIMESTAMP,
          updated_at: FALLBACK_TIMESTAMP,
        };
        setSelectedBuilding(stubBuilding);
      }
    } else {
      hasUrlParam.current = false;
      lastSetBuildingId.current = null;
      console.log('[KioskDisplay] ⚠️ No URL buildingParam, will use context');
    }
  }, [buildingParam, setSelectedBuilding]);

  // Effect 2: Fallback to context building ONLY if no URL param exists
  useEffect(() => {
    if (!hasUrlParam.current && selectedBuilding?.id) {
      console.log(`[KioskDisplay] 📍 Setting effectiveBuildingId from context: ${selectedBuilding.id} (${selectedBuilding.name})`);
      setEffectiveBuildingId(selectedBuilding.id);
    }
  }, [selectedBuilding?.id]);

  // Effect 3: Update selectedBuilding with real building info from API when kioskData loads
  useEffect(() => {
    if (kioskData?.building_info && selectedBuilding?.id === kioskData.building_info.id) {
      // Check if current selectedBuilding is a stub (has "Κτίριο #" name)
      const isStubBuilding = selectedBuilding.name.startsWith('Κτίριο #');

      if (isStubBuilding && kioskData.building_info.name) {
        console.log(`[KioskDisplay] 🔄 Updating stub building with real info: ${kioskData.building_info.name}`);
        const realBuilding: Building = {
          id: kioskData.building_info.id,
          name: kioskData.building_info.name,
          address: kioskData.building_info.address || '',
          city: kioskData.building_info.city || '',
          created_at: FALLBACK_TIMESTAMP,
          updated_at: FALLBACK_TIMESTAMP,
        };
        setSelectedBuilding(realBuilding);
      }
    }
  }, [kioskData?.building_info, selectedBuilding, setSelectedBuilding]);

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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="text-white">
        <KioskSceneRenderer
          key={effectiveBuildingId ?? 'kiosk-default'}
          buildingIdOverride={effectiveBuildingId}
          allowSceneCreation={false}
        />
      </div>
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

function PromoKioskDisplay() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 sm:px-6 lg:px-10">
      <PremiumFeatureInfo
        title="Display kiosk info point"
        description="Η οθόνη εισόδου που ενημερώνει όλους χωρίς login, με δυναμικό περιεχόμενο και μοντέρνα παρουσία."
        note="Απαιτείται ενεργή Premium συνδρομή για το επιλεγμένο κτίριο."
        bullets={[
          'Πλήρης οθόνη ενημέρωσης με αυτόματη εναλλαγή scenes.',
          'Εμφάνιση ανακοινώσεων, ψηφοφοριών, οικονομικών και καιρού.',
          'QR σύνδεση για onboarding κατοίκων χωρίς αναμονή.',
          'Branding και προσαρμογή θεμάτων ανά κτίριο.',
        ]}
        highlights={[
          {
            title: 'Always-on ενημέρωση',
            description: 'Μόνιμη προβολή πληροφοριών στην είσοδο της πολυκατοικίας.',
          },
          {
            title: 'Dynamic περιεχόμενο',
            description: 'Αλλαγές σε πραγματικό χρόνο, χωρίς manual updates στην οθόνη.',
          },
          {
            title: 'Εύκολη εγκατάσταση',
            description: 'Απλό setup σε TV/monitor με ασφαλές public link.',
          },
        ]}
        tags={['Fullscreen', 'Scenes', 'QR Connect', 'Branding']}
        ctaHref="https://newconcierge.app/pricing"
        ctaLabel="Premium συνδρομή"
        ctaExternal
        icon={<Monitor className="h-5 w-5" />}
      />
    </main>
  );
}

function KioskDisplayRouter() {
  const searchParams = useSearchParams();
  const isPromo = searchParams?.get('promo') === '1';
  return isPromo ? <PromoKioskDisplay /> : <KioskDisplayPageContent />;
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
      <KioskDisplayRouter />
    </Suspense>
  );
}
