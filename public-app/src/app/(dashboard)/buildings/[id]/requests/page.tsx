'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchUserRequestsForBuilding } from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';
import ErrorMessage from '@/components/ErrorMessage';
import RequestCard from '@/components/RequestCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function BuildingRequestsPage() {
  const { id } = useParams();
  const buildingId = parseInt(id as string, 10);

  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <div className="p-6 max-w-4xl mx-auto">
        <p>Δεν έχει επιλεγεί κτήριο.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/buildings/${buildingId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">🔧 Αιτήματα Κτιρίου</h1>
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

