'use client';

import { useRouter } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useRequests } from '@/hooks/useRequests';
import { Button } from '@/components/ui/button';
import BuildingGuard from '@/components/Guards/BuildingGuard';

export default function RequestsListPage() {
  const router = useRouter();
  const { currentBuilding, selectedBuilding } = useBuilding();
  
  const buildingId = selectedBuilding?.id || currentBuilding?.id;
  const { data: requests = [], isLoading, isError } = useRequests(buildingId);

  const handleCreateNew = () => {
    router.push('/requests/new');
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📋 Αιτήματα</h1>
        <p>Φόρτωση...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📋 Αιτήματα</h1>
        <p className="text-red-500">Σφάλμα κατά τη φόρτωση των αιτημάτων.</p>
      </div>
    );
  }

  return (
    <BuildingGuard>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">📋 Αιτήματα</h1>
          <Button 
            onClick={handleCreateNew}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            + Νέο Αίτημα
          </Button>
        </div>

        {requests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Δεν υπάρχουν αιτήματα για το επιλεγμένο κτίριο.
          </p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border border-gray-300 rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold">{request.title}</h3>
                <p className="text-sm text-gray-600">Κατάσταση: {request.status}</p>
                <p className="text-sm text-gray-500 mt-1">{request.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </BuildingGuard>
  );
} 