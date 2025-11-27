'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { Building } from '@/lib/api';
import { fetchBuilding, deleteBuilding } from '@/lib/api';
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

  // Check if the ID in URL matches available buildings
  useEffect(() => {
    // Wait for buildings to load
    if (buildingsLoading) return;

    // If we have buildings loaded, check if the URL ID is valid
    if (buildings.length > 0) {
      const urlBuilding = buildings.find(b => b.id === id);
      
      // If URL ID doesn't match any building, redirect to the selected building or first building
      if (!urlBuilding) {
        const targetBuilding = selectedBuilding || buildings[0];
        if (targetBuilding && targetBuilding.id !== id) {
          console.log(`[EditBuilding] URL ID ${id} not found. Redirecting to building ${targetBuilding.id}`);
          router.replace(`/buildings/${targetBuilding.id}/edit`);
          return;
        }
      }
    }
  }, [id, buildings, selectedBuilding, buildingsLoading, router]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchBuilding(id);
        setInitialData(data);
        setError(null);
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error('Error loading building:', err);
        
        // If building not found and we have buildings loaded, redirect to first available
        if (buildings.length > 0 && !buildingsLoading) {
          const targetBuilding = selectedBuilding || buildings[0];
          if (targetBuilding && targetBuilding.id !== id) {
            console.log(`[EditBuilding] Building ${id} not found. Redirecting to building ${targetBuilding.id}`);
            router.replace(`/buildings/${targetBuilding.id}/edit`);
            return;
          }
        }
        
        setError(error.message || 'Αποτυχία φόρτωσης δεδομένων κτιρίου');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, buildings, selectedBuilding, buildingsLoading, router]);

  const handleDelete = async () => {
    if (!initialData) return;
    
    const confirmed = window.confirm(
      `Είστε βέβαιοι ότι θέλετε να διαγράψετε το κτίριο "${initialData.name}";\n\n` +
      `⚠️ Προειδοποίηση: Αυτή η ενέργεια θα διαγράψει επίσης:\n` +
      `• Όλα τα διαμερίσματα του κτιρίου\n` +
      `• Όλες τις ανακοινώσεις\n` +
      `• Όλα τα αιτήματα\n` +
      `• Όλες τις ψηφοφορίες\n` +
      `• Όλες τις οικονομικές κινήσεις\n\n` +
      `Αυτή η ενέργεια δεν μπορεί να αναιρεθεί!`
    );
    
    if (!confirmed) return;
    
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
              <h1 className="text-3xl font-bold text-gray-900">Επεξεργασία Κτιρίου</h1>
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

