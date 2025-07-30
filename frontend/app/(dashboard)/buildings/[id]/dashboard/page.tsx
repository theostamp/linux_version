// frontend/app/buildings/[id]/dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Building } from '@/lib/api';
import { fetchBuilding } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building as BuildingIcon, Edit, MapPin, Phone, Settings, Users, FileText, MessageSquare, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import ErrorMessage from '@/components/ErrorMessage';
import BuildingStreetView from '@/components/BuildingStreetView';

export default function BuildingDashboardPage() {
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
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Διαχείριση Κτιρίου</h1>
              <p className="text-gray-600">
                <MapPin className="w-4 h-4 inline mr-1" />
                {building?.name} - {building?.address}, {building?.city} {building?.postal_code}
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
        <div className="flex items-start space-x-3">
          <BuildingIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Πληροφορίες Διαχείρισης</h3>
            <p className="text-sm text-blue-800 mt-1">
              Εδώ μπορείτε να δείτε τα βασικά στοιχεία του κτιρίου και να αποκτήσετε πρόσβαση στις λειτουργίες διαχείρισης.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Building Details */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <BuildingIcon className="w-5 h-5 mr-2 text-blue-600" />
              Στοιχεία Κτιρίου
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Όνομα Κτιρίου</p>
                <p className="font-medium text-lg">{building?.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Διεύθυνση</p>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{building?.address}</p>
                  {building?.address && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        let googleMapsUrl;
                        if (building.coordinates?.lat && building.coordinates?.lng) {
                          // Χρήση συντεταγμένων αν υπάρχουν (πιο ακριβές)
                          googleMapsUrl = `https://www.google.com/maps?q=${building.coordinates.lat},${building.coordinates.lng}`;
                        } else {
                          // Χρήση διεύθυνσης
                          const address = `${building.address}, ${building.city || ''} ${building.postal_code || ''}`.trim();
                          googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                        }
                        window.open(googleMapsUrl, '_blank');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Χάρτες
                    </Button>
                  )}
                </div>
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
                  <h3 className="text-md font-medium mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-green-600" />
                    Στοιχεία Διαχειριστή
                  </h3>
                  
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
        </div>
        
        {/* Street View */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-green-600" />
                Προβολή Δρόμου
              </h2>
                                {building?.address && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        let googleMapsUrl;
                        if (building.coordinates?.lat && building.coordinates?.lng) {
                          // Χρήση συντεταγμένων αν υπάρχουν (πιο ακριβές)
                          googleMapsUrl = `https://www.google.com/maps?q=${building.coordinates.lat},${building.coordinates.lng}`;
                        } else {
                          // Χρήση διεύθυνσης
                          const address = `${building.address}, ${building.city || ''} ${building.postal_code || ''}`.trim();
                          googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                        }
                        window.open(googleMapsUrl, '_blank');
                      }}
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      {building.coordinates?.lat && building.coordinates?.lng ? 'Χάρτες (ακριβής)' : 'Χάρτες'}
                    </Button>
                  )}
            </div>
            <BuildingStreetView 
              buildingId={id} 
              address={building?.address}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Γρήγορες Ενέργειες</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href={`/buildings/${id}/announcements`}>
              <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Ανακοινώσεις</h3>
                    <p className="text-sm text-gray-600">Διαχείριση ανακοινώσεων</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href={`/buildings/${id}/requests`}>
              <div className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Αιτήματα</h3>
                    <p className="text-sm text-gray-600">Διαχείριση αιτημάτων</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href={`/buildings/${id}/edit`}>
              <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Edit className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Επεξεργασία</h3>
                    <p className="text-sm text-gray-600">Επεξεργασία στοιχείων</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/buildings">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BuildingIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Όλα τα Κτίρια</h3>
                    <p className="text-sm text-gray-600">Επιστροφή στη λίστα</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 