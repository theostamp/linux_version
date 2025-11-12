'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Building } from '@/lib/api';
import { fetchBuilding } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building as BuildingIcon, Edit, MapPin, Settings } from 'lucide-react';
import Link from 'next/link';
import ErrorMessage from '@/components/ErrorMessage';

export default function BuildingDashboardPage() {
  const params = useParams();
  const id = Number(params.id);
  const [building, setBuilding] = useState<Building | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(error.message || 'Αποτυχία φόρτωσης δεδομένων κτιρίου');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Διαχείριση Κτιρίου</h1>
              <p className="text-gray-600">
                <MapPin className="w-4 h-4 inline mr-1" />
                {building?.name}
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

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Πληροφορίες Κτιρίου</h3>
        <p className="text-sm text-blue-800">
          {building?.address}
          {building?.city && `, ${building.city}`}
          {building?.postal_code && ` ${building.postal_code}`}
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href={`/buildings/${id}/announcements`}>
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2">📢 Ανακοινώσεις</h3>
            <p className="text-sm text-gray-600">Δείτε όλες τις ανακοινώσεις του κτιρίου</p>
          </div>
        </Link>
        <Link href={`/buildings/${id}/requests`}>
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2">🔧 Αιτήματα</h3>
            <p className="text-sm text-gray-600">Δείτε όλα τα αιτήματα συντήρησης</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

