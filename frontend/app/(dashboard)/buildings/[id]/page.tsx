// frontend/app/buildings/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Building } from '@/lib/api';
import { fetchBuilding } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building as BuildingIcon, Edit, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import ErrorMessage from '@/components/ErrorMessage';
import BuildingStreetView from '@/components/BuildingStreetView';

export default function BuildingDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      } catch (err: any) {
        console.error('Error loading building:', err);
        setError('Αποτυχία φόρτωσης δεδομένων κτιρίου');
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
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BuildingIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{building?.name}</h1>
              <p className="text-gray-600">
                <MapPin className="w-4 h-4 inline mr-1" />
                {building?.address}, {building?.city} {building?.postal_code}
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
        {/* Building Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Στοιχεία Κτιρίου</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Διεύθυνση</p>
              <p className="font-medium">{building?.address}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Πόλη</p>
                <p className="font-medium">{building?.city}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Τ.Κ.</p>
                <p className="font-medium">{building?.postal_code}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Αριθμός Διαμερισμάτων</p>
              <p className="font-medium">{building?.apartments_count || 'Μη καταχωρημένο'}</p>
            </div>
            
            {(building?.internal_manager_name || building?.internal_manager_phone) && (
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h3 className="text-md font-medium mb-2">Στοιχεία Διαχειριστή</h3>
                
                {building?.internal_manager_name && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500">Όνομα</p>
                    <p className="font-medium">{building.internal_manager_name}</p>
                  </div>
                )}
                
                {building?.internal_manager_phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    <a href={`tel:${building.internal_manager_phone}`} className="text-blue-600 hover:underline">
                      {building.internal_manager_phone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Street View */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Προβολή Δρόμου</h2>
          <BuildingStreetView 
            buildingId={id} 
            address={building?.address}
          />
        </div>
      </div>
    </div>
  );
} 