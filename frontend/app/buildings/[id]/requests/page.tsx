// 📁 frontend/app/buildings/[id]/requests/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchUserRequestsForBuilding } from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';
import ErrorMessage from '@/components/ErrorMessage';
// στο τέλος ή δίπλα στον ορισμό


export default function BuildingRequestsPage() {
  const { id } = useParams();
  const buildingId = parseInt(id as string, 10);

  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [error, setError] = useState('');

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
      <h1 className="text-2xl font-bold mb-6">📋 Αιτήματα Κτηρίου #{buildingId}</h1>

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
