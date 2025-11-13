'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Building } from '@/lib/api';
import { fetchBuilding, deleteBuilding } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building as BuildingIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import ErrorMessage from '@/components/ErrorMessage';
import { toast } from 'sonner';
import { useBuilding } from '@/components/contexts/BuildingContext';

export default function EditBuildingPage() {
  const params = useParams();
  const router = useRouter();
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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Φόρτωση δεδομένων κτιρίου...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/buildings/${id}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">✏️ Επεξεργασία Κτιρίου</h1>
        <Button
          onClick={handleDelete}
          disabled={deleting}
          variant="destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleting ? 'Διαγραφή...' : 'Διαγραφή'}
        </Button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <BuildingIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900 mb-2">⚠️ Component Missing</h3>
            <p className="text-sm text-yellow-800">
              Το CreateBuildingForm component λείπει. Χρειάζεται να δημιουργηθεί για να λειτουργήσει αυτή η σελίδα.
            </p>
            <p className="text-xs text-yellow-700 mt-2">
              Το component χρειάζεται: AddressAutocomplete, StreetViewImage, και fetchBuildingResidents/fetchApartments API functions.
            </p>
            {initialData && (
              <div className="mt-4 p-4 bg-white rounded border">
                <p className="text-sm font-medium mb-2">Τρέχον Κτίριο:</p>
                <p className="text-sm">{initialData.name}</p>
                <p className="text-sm text-gray-600">{initialData.address}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

