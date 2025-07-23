// 📁 frontend/app/buildings/[id]/requests/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchUserRequestsForBuilding } from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
// στο τέλος ή δίπλα στον ορισμό


export default function BuildingRequestsPage() {
  const { id } = useParams();
  const router = useRouter();
  const buildingId = parseInt(id as string, 10);

  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [error, setError] = useState('');

  const handleCreateNew = () => {
    router.push('/requests/new');
  };

  useEffect(() => {
    if (!buildingId) return;

    const load = async () => {
      try {
        const data = await fetchUserRequestsForBuilding(buildingId);
        setRequests(data);
      } catch (e) {
        console.error('Request fetch failed', e);
        setError('Αποτυχία φόρτωσης αιτημάτων');
      }
    };

    load();
  }, [buildingId]);

  if (error) return <ErrorMessage message={error} />;
  if (!buildingId) return <p className="p-6">Δεν έχει επιλεγεί κτήριο.</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📋 Αιτήματα Κτηρίου #{buildingId}</h1>
        <Button 
          onClick={handleCreateNew}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
        >
          + Νέο Αίτημα
        </Button>
      </div>

      {requests.length === 0 ? (
        <p className="text-gray-500">Δεν υπάρχουν αιτήματα για το επιλεγμένο κτήριο.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="border border-gray-300 rounded p-4 shadow-sm">
              <p className="font-semibold text-lg">{r.title}</p>
              <p className="text-sm text-gray-600">Κατάσταση: {r.status}</p>
              <p className="text-sm text-gray-500">{r.type || '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
