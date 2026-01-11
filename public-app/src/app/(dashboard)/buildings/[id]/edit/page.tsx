'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { Building } from '@/lib/api';
import { fetchBuilding, deleteBuilding } from '@/lib/api';
import { confirmBuildingDeletion } from '@/lib/confirmations';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building as BuildingIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import ErrorMessage from '@/components/ErrorMessage';
import { toast } from 'sonner';
import { useBuilding } from '@/components/contexts/BuildingContext';
import CreateBuildingForm from '@/components/buildings/CreateBuildingForm';

export default function EditBuildingPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);
  const { buildings, selectedBuilding, isLoading: buildingsLoading, refreshBuildings } = useBuilding();
  const [initialData, setInitialData] = useState<Building | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Use ref to track if we've already loaded data for this ID
  const loadedIdRef = useRef<number | null>(null);
  const loadingRef = useRef(false);

  // Check if the ID in URL matches available buildings
  // IMPORTANT: Only redirect if we've tried to load the building and it failed
  // Don't redirect just because the building isn't in the list yet (e.g., after creating a new building)
  useEffect(() => {
    // Wait for buildings to load AND for the building fetch attempt to complete
    if (buildingsLoading || loading) return;

    // If we successfully loaded the building, don't redirect
    if (initialData) return;

    // Only redirect if we have an error AND the building is not in the list
    // This prevents redirecting when a new building is created but not yet in the list
    if (error && !buildingsLoading && buildings.length > 0) {
      const urlBuilding = buildings.find(b => b.id === id);

      // Only redirect if building is not in list AND we have an error
      if (!urlBuilding) {
        const targetBuilding = selectedBuilding || buildings[0];
        if (targetBuilding && targetBuilding.id !== id) {
          console.log(`[EditBuilding] URL ID ${id} not found and fetch failed. Redirecting to building ${targetBuilding.id}`);
          router.replace(`/buildings/${targetBuilding.id}/edit`);
          return;
        }
      }
    }
  }, [id, buildings, selectedBuilding, buildingsLoading, loading, initialData, error, router]);

  // Load building data - only depends on id
  useEffect(() => {
    // Skip if already loading or already loaded this ID
    if (loadingRef.current) return;
    if (loadedIdRef.current === id && initialData) return;

    async function load() {
      loadingRef.current = true;
      try {
        setLoading(true);
        setError(null);

        console.log(`[EditBuilding] Fetching building ${id}...`);
        const data = await fetchBuilding(id);
        console.log(`[EditBuilding] Fetched building:`, data);

        setInitialData(data);
        loadedIdRef.current = id;
      } catch (err: unknown) {
        const apiError = err as { message?: string };
        console.error('[EditBuilding] Error loading building:', err);
        setError(apiError.message || 'Αποτυχία φόρτωσης δεδομένων κτιρίου');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    }

    load();
  }, [id]); // Only re-run when id changes

  // Handle redirect on error after buildings are loaded
  useEffect(() => {
    if (error && !buildingsLoading && buildings.length > 0) {
      const targetBuilding = selectedBuilding || buildings[0];
      if (targetBuilding && targetBuilding.id !== id) {
        console.log(`[EditBuilding] Building ${id} not found. Redirecting to building ${targetBuilding.id}`);
        router.replace(`/buildings/${targetBuilding.id}/edit`);
      }
    }
  }, [error, buildings, selectedBuilding, buildingsLoading, id, router]);

  const handleDelete = async () => {
    if (!initialData) return;
    if (!confirmBuildingDeletion(initialData.name)) return;

    setDeleting(true);
    try {
      await deleteBuilding(id);
      toast.success('Το κτίριο διαγράφηκε επιτυχώς');
      await refreshBuildings();
      router.push('/buildings');
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMessage = err?.message || 'Σφάλμα κατά τη διαγραφή του κτιρίου';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Φόρτωση δεδομένων κτιρίου...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/buildings">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Επιστροφή στα Κτίρια
            </Button>
          </Link>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <Link href="/buildings" className="hover:text-blue-600 transition-colors">
          Κτίρια
        </Link>
        <span>/</span>
        {initialData && (
          <>
            <Link href={`/buildings/${id}`} className="hover:text-blue-600 transition-colors">
              {initialData.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 font-medium">Επεξεργασία</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={initialData ? `/buildings/${id}` : '/buildings'}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Επιστροφή
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BuildingIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="page-title">Επεξεργασία Κτιρίου</h1>
              {initialData?.name && (
                <p className="text-gray-600">{initialData.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Delete Button */}
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center space-x-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>{deleting ? 'Διαγραφή...' : 'Διαγραφή Κτιρίου'}</span>
        </Button>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {initialData ? (
            <CreateBuildingForm
              key={`building-form-${id}`}
              initialData={initialData}
              buildingId={id}
              submitText="Ενημέρωση Κτιρίου"
              onSuccess={async (updatedBuilding) => {
                toast.success('Το κτίριο ενημερώθηκε επιτυχώς');
                await refreshBuildings();
                // ✅ Invalidate AND explicitly refetch for immediate UI update
                await queryClient.invalidateQueries({ queryKey: ['buildings'] });
                await queryClient.invalidateQueries({ queryKey: ['financial'] });
                await queryClient.refetchQueries({ queryKey: ['buildings'] });
                await queryClient.refetchQueries({ queryKey: ['financial'] });
                router.push(`/buildings/${updatedBuilding.id}`);
              }}
              onCancel={() => {
                router.push(`/buildings/${id}`);
              }}
            />
          ) : (
            <ErrorMessage message="Δεν ήταν δυνατή η φόρτωση των δεδομένων του κτιρίου" />
          )}
        </div>
      </div>
    </div>
  );
}
