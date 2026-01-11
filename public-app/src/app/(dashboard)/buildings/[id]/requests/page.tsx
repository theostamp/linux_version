'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchUserRequestsForBuilding } from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';
import ErrorMessage from '@/components/ErrorMessage';
import RequestCard from '@/components/RequestCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';

export default function BuildingRequestsPage() {
  const { id } = useParams();
  const router = useRouter();
  const buildingId = parseInt(id as string, 10);
  const { buildings, selectedBuilding, isLoading: buildingsLoading } = useBuilding();

  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if the ID in URL matches available buildings
  useEffect(() => {
    // Wait for buildings to load
    if (buildingsLoading) return;

    // If we have buildings loaded, check if the URL ID is valid
    if (buildings.length > 0) {
      const urlBuilding = buildings.find(b => b.id === buildingId);

      // If URL ID doesn't match any building, redirect to the selected building or first building
      if (!urlBuilding) {
        const targetBuilding = selectedBuilding || buildings[0];
        if (targetBuilding && targetBuilding.id !== buildingId) {
          console.log(`[BuildingRequests] URL ID ${buildingId} not found. Redirecting to building ${targetBuilding.id}`);
          router.replace(`/buildings/${targetBuilding.id}/requests`);
          return;
        }
      }
    }
  }, [buildingId, buildings, selectedBuilding, buildingsLoading, router]);

  useEffect(() => {
    if (!buildingId) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchUserRequestsForBuilding(buildingId);
        setRequests(data);
        setError('');
      } catch (e) {
        console.error('Request fetch failed', e);
        setError('Αποτυχία φόρτωσης αιτημάτων');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [buildingId]);

  if (!buildingId) {
    return (
      <div>
        <p>Δεν έχει επιλεγεί κτήριο.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link href={`/buildings/${buildingId}`}>
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
        </Link>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/buildings/${buildingId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
        </Link>
        <h1 className="page-title-sm">🔧 Αιτήματα Κτιρίου</h1>
        <div></div>
      </div>

      {loading && (
        <div className="text-center text-gray-500 py-12">
          <p>Φόρτωση αιτημάτων...</p>
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <p>Δεν υπάρχουν αιτήματα για το επιλεγμένο κτήριο.</p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
