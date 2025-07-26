'use client';

import { useEffect, useState } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { fetchBuildingApartments, ApartmentList, BuildingApartmentsResponse } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import ApartmentCard from '@/components/ApartmentCard';
import ApartmentTable from '@/components/ApartmentTable';
import ErrorMessage from '@/components/ErrorMessage';

export default function ApartmentsPage() {
  const { currentBuilding, selectedBuilding, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady, user } = useAuth();
  const [data, setData] = useState<BuildingApartmentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'rented' | 'owned' | 'empty'>('all');
  const [sortBy, setSortBy] = useState<'number' | 'owner_name' | 'status'>('number');

  const canManage = user?.is_superuser || user?.is_staff;
  const buildingId = selectedBuilding?.id;

  useEffect(() => {
    if (isAuthReady && buildingId && canManage) {
      loadApartments();
    }
  }, [isAuthReady, buildingId, canManage]);

  const loadApartments = async () => {
    if (!buildingId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetchBuildingApartments(buildingId);
      setData(response);
    } catch (err: any) {
      console.error('Error loading apartments:', err);
      setError('Αποτυχία φόρτωσης διαμερισμάτων');
      toast.error('Αποτυχία φόρτωσης διαμερισμάτων');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadApartments();
  };

  // Φιλτράρισμα και ταξινόμηση διαμερισμάτων
  const filteredApartments = data?.apartments?.filter(apartment => {
    // Φιλτράρισμα ανά αναζήτηση
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !apartment.number.toLowerCase().includes(searchLower) &&
        !apartment.identifier.toLowerCase().includes(searchLower) &&
        !apartment.owner_name.toLowerCase().includes(searchLower) &&
        !apartment.occupant_name.toLowerCase().includes(searchLower) &&
        !apartment.owner_phone.toLowerCase().includes(searchLower) &&
        !apartment.owner_phone2.toLowerCase().includes(searchLower) &&
        !apartment.owner_email.toLowerCase().includes(searchLower) &&
        !apartment.tenant_name.toLowerCase().includes(searchLower) &&
        !apartment.tenant_phone.toLowerCase().includes(searchLower) &&
        !apartment.tenant_phone2.toLowerCase().includes(searchLower) &&
        !apartment.tenant_email.toLowerCase().includes(searchLower) &&
        !apartment.occupant_phone.toLowerCase().includes(searchLower) &&
        !apartment.occupant_phone2.toLowerCase().includes(searchLower) &&
        !apartment.occupant_email.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Φιλτράρισμα ανά κατάσταση
    if (statusFilter === 'rented' && !apartment.is_rented) return false;
    if (statusFilter === 'owned' && (apartment.is_rented || !apartment.owner_name)) return false;
    if (statusFilter === 'empty' && (apartment.owner_name || apartment.is_rented)) return false;

    return true;
  }) || [];

  // Ταξινόμηση
  const sortedApartments = [...filteredApartments].sort((a, b) => {
    switch (sortBy) {
      case 'number':
        return a.number.localeCompare(b.number, undefined, { numeric: true });
      case 'owner_name':
        return a.owner_name.localeCompare(b.owner_name);
      case 'status':
        return a.status_display.localeCompare(b.status_display);
      default:
        return 0;
    }
  });

  if (!isAuthReady || buildingLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🏠 Διαχείριση Διαμερισμάτων</h1>
        <BuildingFilterIndicator className="mb-4" />
        <p>Φόρτωση...</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🏠 Διαχείριση Διαμερισμάτων</h1>
        <BuildingFilterIndicator className="mb-4" />
        <ErrorMessage message="Δεν έχετε δικαίωμα πρόσβασης στη διαχείριση διαμερισμάτων." />
      </div>
    );
  }

  if (!selectedBuilding) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🏠 Διαχείριση Διαμερισμάτων</h1>
        <BuildingFilterIndicator className="mb-4" />
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            Επιλέξτε ένα κτίριο για να δείτε τα διαμερίσματά του.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🏠 Διαχείριση Διαμερισμάτων</h1>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline">
            Ανανέωση
          </Button>
          <Link href="/apartments/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Νέο Διαμέρισμα
            </Button>
          </Link>
        </div>
      </div>

      <BuildingFilterIndicator className="mb-4" />

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Πληροφορίες κτιρίου */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-2">{data.building.name}</h2>
            <p className="text-gray-600 mb-4">{data.building.address}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">{data.apartments.length}</div>
                <div className="text-sm text-blue-800">Συνολικά</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {data.apartments.filter(a => a.is_rented).length}
                </div>
                <div className="text-sm text-green-800">Ενοικιασμένα</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">
                  {data.apartments.filter(a => !a.is_rented && a.owner_name).length}
                </div>
                <div className="text-sm text-purple-800">Ιδιοκατοίκηση</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-600">
                  {data.apartments.filter(a => !a.owner_name && !a.is_rented).length}
                </div>
                <div className="text-sm text-gray-800">Κενά</div>
              </div>
            </div>
          </div>

          {/* Φίλτρα και Αναζήτηση */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Αναζήτηση */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Αναζήτηση διαμερίσματος, διακριτικού, ονόματος, τηλεφώνου, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Φίλτρο κατάστασης */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Όλα</option>
                  <option value="rented">Ενοικιασμένα</option>
                  <option value="owned">Ιδιοκατοίκηση</option>
                  <option value="empty">Κενά</option>
                </select>
              </div>

              {/* Ταξινόμηση */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Ταξινόμηση:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="number">Αριθμός</option>
                  <option value="owner_name">Ιδιοκτήτης</option>
                  <option value="status">Κατάσταση</option>
                </select>
              </div>

              {/* Εναλλαγή προβολής */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 text-sm ${
                    viewMode === 'table'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Πίνακας
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 text-sm ${
                    viewMode === 'cards'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Κάρτες
                </button>
              </div>
            </div>
          </div>

          {/* Αποτελέσματα */}
          <div className="bg-white rounded-lg shadow-sm border">
            {sortedApartments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Δεν βρέθηκαν διαμερίσματα με τα τρέχοντα φίλτρα.</p>
              </div>
            ) : viewMode === 'table' ? (
              <ApartmentTable apartments={sortedApartments} onRefresh={handleRefresh} />
            ) : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedApartments.map(apartment => (
                  <ApartmentCard 
                    key={apartment.id} 
                    apartment={apartment} 
                    onRefresh={handleRefresh}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Δεν υπάρχουν δεδομένα διαμερισμάτων.</p>
        </div>
      )}
    </div>
  );
} 