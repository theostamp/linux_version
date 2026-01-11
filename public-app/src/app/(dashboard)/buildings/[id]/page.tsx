'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Building } from '@/lib/api';
import { fetchBuilding } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building as BuildingIcon, Edit, MapPin } from 'lucide-react';
import Link from 'next/link';
import ErrorMessage from '@/components/ErrorMessage';
import { useBuilding } from '@/components/contexts/BuildingContext';

export default function BuildingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { buildings, selectedBuilding, isLoading: buildingsLoading } = useBuilding();
  const [building, setBuilding] = useState<Building | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          console.log(`[BuildingDetail] URL ID ${id} not found. Redirecting to building ${targetBuilding.id}`);
          router.replace(`/buildings/${targetBuilding.id}`);
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
        setBuilding(data);
        setError(null);
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error('Error loading building:', err);

        // If building not found and we have buildings loaded, redirect to first available
        if (buildings.length > 0 && !buildingsLoading) {
          const targetBuilding = selectedBuilding || buildings[0];
          if (targetBuilding && targetBuilding.id !== id) {
            console.log(`[BuildingDetail] Building ${id} not found. Redirecting to building ${targetBuilding.id}`);
            router.replace(`/buildings/${targetBuilding.id}`);
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

  if (!building) {
    return (
      <div>
        <Link href="/buildings">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή στα Κτίρια
          </Button>
        </Link>
        <p>Το κτίριο δεν βρέθηκε.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/buildings">
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
              <h1 className="page-title">{building.name}</h1>
              <p className="text-gray-600">
                <MapPin className="w-4 h-4 inline mr-1" />
                {building.address}
                {building.city && `, ${building.city}`}
                {building.postal_code && ` ${building.postal_code}`}
              </p>
            </div>
          </div>
        </div>
        <Link href={`/buildings/${id}/edit`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Επεξεργασία
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Building Info Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Πληροφορίες Κτιρίου</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Όνομα:</span>
              <p className="font-medium">{building.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Διεύθυνση:</span>
              <p className="font-medium">{building.address}</p>
            </div>
            {building.city && (
              <div>
                <span className="text-sm text-gray-500">Πόλη:</span>
                <p className="font-medium">{building.city}</p>
              </div>
            )}
            {building.postal_code && (
              <div>
                <span className="text-sm text-gray-500">Ταχυδρομικός Κώδικας:</span>
                <p className="font-medium">{building.postal_code}</p>
              </div>
            )}
            {building.total_apartments !== undefined && (
              <div>
                <span className="text-sm text-gray-500">Διαμερίσματα:</span>
                <p className="font-medium">{building.total_apartments}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-500">Δημιουργήθηκε:</span>
              <p className="font-medium">
                {new Date(building.created_at).toLocaleDateString('el-GR')}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Γρήγορες Ενέργειες</h2>
          <div className="space-y-2">
            <Link href={`/buildings/${id}/dashboard`}>
              <Button variant="outline" className="w-full justify-start">
                📊 Dashboard
              </Button>
            </Link>
            <Link href={`/buildings/${id}/announcements`}>
              <Button variant="outline" className="w-full justify-start">
                📢 Ανακοινώσεις
              </Button>
            </Link>
            <Link href={`/buildings/${id}/requests`}>
              <Button variant="outline" className="w-full justify-start">
                🔧 Αιτήματα
              </Button>
            </Link>
            <Link href={`/buildings/${id}/edit`}>
              <Button variant="outline" className="w-full justify-start">
                ✏️ Επεξεργασία
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
