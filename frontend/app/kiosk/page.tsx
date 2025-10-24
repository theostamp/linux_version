'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePublicInfo } from '@/hooks/usePublicInfo';
import { useBuildingChange } from '@/hooks/useBuildingChange';
import KioskSceneRenderer from '@/components/KioskSceneRenderer';
import KioskWidgetRenderer from '@/components/KioskWidgetRenderer';
// import KioskCanvasRenderer from '@/components/KioskCanvasRenderer';
import FullPageSpinner from '@/components/FullPageSpinner';
import { fetchAllBuildingsPublic } from '@/lib/api';
import { fetchPublicMaintenanceCounters, fetchPublicScheduledMaintenance } from '@/lib/apiPublic';
import { useSearchParams } from 'next/navigation';

// Global flag to prevent multiple building loads across component re-mounts
let BUILDINGS_LOADED = false;
let BUILDINGS_DATA: any[] = [];
let BUILDINGS_LOADING = false; // Prevent concurrent loads

export default function KioskPage() {

  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [buildings, setBuildings] = useState<any[]>(BUILDINGS_DATA);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(!BUILDINGS_LOADED);
  const [useCanvasMode, setUseCanvasMode] = useState(false);
  const [useSceneMode, setUseSceneMode] = useState(true); // Default to scene mode
  const [maintenanceInfo, setMaintenanceInfo] = useState({
    active_contractors: 0,
    pending_receipts: 0,
    scheduled_maintenance: 0,
    urgent_maintenance: 0,
  });
  const searchParams = useSearchParams();

  // Use the selected building ID for data fetching
  const { data, isLoading, error, isFetching } = usePublicInfo(selectedBuildingId ?? null);

  // Use the building change hook
  const { isChangingBuilding, changeBuilding } = useBuildingChange({
    onBuildingChange: (buildingId) => {
      setSelectedBuildingId(buildingId);
    },
    onError: (error) => {
      console.error('Building change error:', error);
    },
    showToast: false // Disable toast notifications for kiosk mode
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle canvas mode with Ctrl+Alt+C
      if (event.ctrlKey && event.altKey && event.key === 'c') {
        event.preventDefault();
        setUseCanvasMode(!useCanvasMode);
        console.log('🎨 Canvas mode toggled:', !useCanvasMode);
      }
      // Toggle scene mode with Ctrl+Alt+S
      if (event.ctrlKey && event.altKey && event.key === 's') {
        event.preventDefault();
        setUseSceneMode(!useSceneMode);
        console.log('🎬 Scene mode toggled:', !useSceneMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [useCanvasMode, useSceneMode]);

  // Fetch maintenance info when building changes
  useEffect(() => {
    async function loadMaintenanceInfo() {
      try {
        const b = data?.building_info?.id ?? selectedBuildingId ?? 1;
        const counters = await fetchPublicMaintenanceCounters(b);
        setMaintenanceInfo({
          active_contractors: counters.active_contractors,
          pending_receipts: counters.pending_receipts,
          scheduled_maintenance: counters.scheduled_total,
          urgent_maintenance: counters.urgent_total,
        });
      } catch (error) {
        console.error('Failed to load maintenance info:', error);
        setMaintenanceInfo({
          active_contractors: 0,
          pending_receipts: 0,
          scheduled_maintenance: 0,
          urgent_maintenance: 0,
        });
      }
    }

    if (data?.building_info?.id || selectedBuildingId) {
      loadMaintenanceInfo();
    }
  }, [data?.building_info?.id, selectedBuildingId]);

  // Load all buildings for selection (only once)
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts

    async function loadBuildings() {
      if (BUILDINGS_LOADED || BUILDINGS_LOADING || !isMounted) {
        return; // Prevent multiple concurrent calls
      }

      BUILDINGS_LOADING = true;

      try {
        console.log('[KIOSK] Loading buildings for selection...');
        const buildingsData = await fetchAllBuildingsPublic();

        if (!isMounted) return; // Component unmounted during fetch

        console.log('[KIOSK] Buildings loaded successfully:', buildingsData.length);
        BUILDINGS_DATA = buildingsData;
        setBuildings(buildingsData);

        // Check URL parameter for building ID
        const buildingParam = searchParams.get('building');
        if (buildingParam) {
          if (buildingParam === 'all') {
            console.log('[KIOSK] Using all buildings from URL');
            setSelectedBuildingId(null);
          } else {
            const buildingId = parseInt(buildingParam);
            if (!isNaN(buildingId)) {
              console.log('[KIOSK] Using building ID from URL:', buildingId);
              setSelectedBuildingId(buildingId);
            } else {
              console.log('[KIOSK] Invalid building ID in URL, using fallback');
              setSelectedBuildingId(3);
            }
          }
        } else {
          // Auto-select first building if no URL parameter
          if (buildingsData.length > 0) {
            console.log('[KIOSK] Auto-selecting first building:', buildingsData[0].id);
            setSelectedBuildingId(buildingsData[0].id);
          } else {
            console.log('[KIOSK] No buildings available, using fallback');
            setSelectedBuildingId(3);
          }
        }
      } catch (error) {
        if (!isMounted) return;

        console.error('[KIOSK] Failed to load buildings:', error);
        // Simple fallback
        setSelectedBuildingId(3);
      } finally {
        if (isMounted) {
          setIsLoadingBuildings(false);
          BUILDINGS_LOADED = true;
          BUILDINGS_LOADING = false;
        }
      }
    }

    loadBuildings();

    return () => {
      isMounted = false; // Cleanup function
    };
  }, []); // Empty dependency array - only run once on mount

  if (isLoadingBuildings) {
    return <FullPageSpinner />;
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center text-white font-ubuntu">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Σφάλμα Φόρτωσης</h1>
          <p className="text-red-200 text-lg mb-6">
            Δεν ήταν δυνατή η φόρτωση των πληροφοριών.
          </p>
          <div className="text-sm text-red-300">
            <p>Πατήστε <kbd className="px-2 py-1 bg-red-700 rounded text-xs">Ctrl + Alt + B</kbd> για επιλογή κτιρίου</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      {useCanvasMode ? (
        <KioskSceneRenderer
          selectedBuildingId={selectedBuildingId}
        />
      ) : useSceneMode ? (
        <KioskSceneRenderer
          selectedBuildingId={selectedBuildingId}
        />
      ) : (
        <KioskWidgetRenderer
          selectedBuildingId={selectedBuildingId}
          onBuildingChange={changeBuilding}
        />
      )}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchPublicProjects, type PublicProject } from '@/lib/apiPublic';

function PublicProjectsCard({ buildingId = 1 }: { buildingId?: number }) {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublicProjects(buildingId);
        setProjects(data);
      } catch (e: any) {
        setError(e?.message ?? 'Αποτυχία φόρτωσης έργων');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [buildingId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Έργα (Δημόσια)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm">Φόρτωση...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && projects.length === 0 && (
          <div className="text-sm text-muted-foreground">Δεν υπάρχουν έργα προς εμφάνιση.</div>
        )}
        <div className="grid gap-3">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between border rounded p-3">
              <div className="text-sm">
                <div className="font-medium">{p.title}</div>
                <div className="text-muted-foreground">{p.status}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {p.start_date ? new Date(p.start_date).toLocaleDateString() : ''}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}