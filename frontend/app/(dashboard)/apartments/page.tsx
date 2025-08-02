'use client';

import { useEffect, useState, useMemo } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { fetchBuildingApartments, ApartmentList, BuildingApartmentsResponse } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Users, Home } from 'lucide-react';
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
  
  // Νέο state για tabs
  const [activeTab, setActiveTab] = useState<'apartments' | 'residents'>('apartments');
  
  // State για τους κατοίκους
  const [residentsSearchTerm, setResidentsSearchTerm] = useState('');

  const canManage = user?.is_superuser || user?.is_staff;
  const buildingId = selectedBuilding?.id;
  
  // Μετατροπή δεδομένων διαμερισμάτων σε λίστα κατοίκων
  const residentsFromApartments = useMemo(() => {
    if (!data?.apartments) return [];
    
    const residents: any[] = [];
    
    data.apartments.forEach(apartment => {
      // Προσθήκη ιδιοκτήτη (μόνο αν δεν είναι ενοικιασμένο ή αν είναι ιδιοκατοίκηση)
      if (apartment.owner_name && (!apartment.is_rented || apartment.is_closed)) {
        residents.push({
          id: `owner_${apartment.id}`,
          name: apartment.owner_name,
          email: apartment.owner_email || '',
          phone: apartment.owner_phone || apartment.owner_phone2 || '',
          apartment: apartment.number,
          role: 'owner',
          type: 'Ιδιοκτήτης'
        });
      }
      
      // Προσθήκη ενοικιαστή (μόνο αν είναι ενοικιασμένο)
      if (apartment.tenant_name && apartment.is_rented && !apartment.is_closed) {
        residents.push({
          id: `tenant_${apartment.id}`,
          name: apartment.tenant_name,
          email: apartment.tenant_email || '',
          phone: apartment.tenant_phone || apartment.tenant_phone2 || '',
          apartment: apartment.number,
          role: 'tenant',
          type: 'Ένοικος'
        });
      }
      
      // Προσθήκη κάτοικου (μόνο αν είναι διαφορετικός από τον ιδιοκτήτη και τον ενοικιαστή)
      if (apartment.occupant_name && 
          apartment.occupant_name !== apartment.owner_name && 
          apartment.occupant_name !== apartment.tenant_name &&
          apartment.occupant_name !== 'Μη καταχωρημένο' &&
          apartment.occupant_name !== 'Κλειστό') {
        residents.push({
          id: `occupant_${apartment.id}`,
          name: apartment.occupant_name,
          email: apartment.occupant_email || '',
          phone: apartment.occupant_phone || apartment.occupant_phone2 || '',
          apartment: apartment.number,
          role: 'occupant',
          type: 'Κάτοικος'
        });
      }
    });
    
    return residents;
  }, [data?.apartments]);
  
  // Φιλτράρισμα και ταξινόμηση των κατοίκων
  const filteredAndSortedResidents = useMemo(() => {
    if (!residentsFromApartments) return [];
    
    let filtered = residentsFromApartments;
    
    // Φιλτράρισμα με βάση το search term
    if (residentsSearchTerm.trim()) {
      const term = residentsSearchTerm.toLowerCase().trim();
      filtered = residentsFromApartments.filter((resident: any) => 
        resident.name.toLowerCase().includes(term) ||
        resident.email.toLowerCase().includes(term) ||
        resident.apartment.toLowerCase().includes(term) ||
        resident.phone?.toLowerCase().includes(term) ||
        resident.type.toLowerCase().includes(term)
      );
    }
    
    // Ταξινόμηση αλφαβητικά με βάση το όνομα
    return filtered.sort((a: any, b: any) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [residentsFromApartments, residentsSearchTerm]);

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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">🏠 Διαχείριση Διαμερισμάτων</h1>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              Ανανέωση
            </Button>
            {activeTab === 'apartments' && (
              <Link href="/apartments/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Νέο Διαμέρισμα
                </Button>
              </Link>
            )}
            {activeTab === 'residents' && (
              <Link href="/residents/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Νέος Κάτοικος
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('apartments')}
            className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'apartments'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Home className="w-4 h-4 mr-2" />
            Διαμερίσματα
            {data?.apartments && (
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {data.apartments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('residents')}
            className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'residents'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Κάτοικοι
            {residentsFromApartments && (
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {residentsFromApartments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <BuildingFilterIndicator className="mb-4" />

      {error && <ErrorMessage message={error} />}

      {/* Content Area */}
      {activeTab === 'apartments' ? (
        // Apartments Tab
        loading ? (
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
        )
      ) : (
        // Residents Tab
        loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-600">Φόρτωση κατοίκων...</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Πληροφορίες κτιρίου για κατοίκους */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-2">{selectedBuilding?.name}</h2>
              <p className="text-gray-600 mb-4">{selectedBuilding?.address}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {residentsFromApartments.length}
                  </div>
                  <div className="text-sm text-blue-800">Συνολικοί Κάτοικοι</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {residentsFromApartments.filter(r => r.role === 'owner').length}
                  </div>
                  <div className="text-sm text-green-800">Ιδιοκτήτες</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-600">
                    {residentsFromApartments.filter(r => r.role === 'tenant').length}
                  </div>
                  <div className="text-sm text-purple-800">Ένοικοι</div>
                </div>
              </div>
            </div>

            {/* Αναζήτηση κατοίκων */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Αναζήτηση κατοίκων (όνομα, επώνυμο, email, διαμέρισμα, τηλέφωνο, ρόλος)..."
                  value={residentsSearchTerm}
                  onChange={(e) => setResidentsSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {residentsSearchTerm && (
                  <button
                    onClick={() => setResidentsSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Λίστα κατοίκων */}
            <div className="bg-white rounded-lg shadow-sm border">
              {filteredAndSortedResidents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {residentsSearchTerm ? (
                    <>
                      <p className="mb-4">
                        Δεν βρέθηκαν κάτοικοι που να ταιριάζουν με την αναζήτηση "{residentsSearchTerm}".
                      </p>
                      <button
                        onClick={() => setResidentsSearchTerm("")}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                      >
                        Καθαρισμός Αναζήτησης
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="mb-4">Δεν υπάρχουν κάτοικοι σε αυτό το κτίριο.</p>
                      <Link 
                        href="/residents/new"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                      >
                        Προσθήκη Πρώτου Κατοίκου
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border-b px-6 py-3 text-left font-semibold text-gray-900">Όνομα</th>
                        <th className="border-b px-6 py-3 text-left font-semibold text-gray-900">Email</th>
                        <th className="border-b px-6 py-3 text-left font-semibold text-gray-900">Διαμέρισμα</th>
                        <th className="border-b px-6 py-3 text-left font-semibold text-gray-900">Ρόλος</th>
                        <th className="border-b px-6 py-3 text-left font-semibold text-gray-900">Τηλέφωνο</th>
                        <th className="border-b px-6 py-3 text-left font-semibold text-gray-900">Ημ/νία Αντιστοίχισης</th>
                      </tr>
                    </thead>
                                         <tbody>
                       {filteredAndSortedResidents.map((res: any) => (
                         <tr key={res.id} className="hover:bg-gray-50">
                           <td className="border-b px-6 py-4">
                             {res.name}
                           </td>
                           <td className="border-b px-6 py-4 text-gray-600">{res.email || '-'}</td>
                           <td className="border-b px-6 py-4 font-medium">{res.apartment}</td>
                           <td className="border-b px-6 py-4">
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                               res.role === 'owner' ? 'bg-blue-100 text-blue-800' :
                               res.role === 'tenant' ? 'bg-green-100 text-green-800' :
                               'bg-purple-100 text-purple-800'
                             }`}>
                               {res.type}
                             </span>
                           </td>
                           <td className="border-b px-6 py-4 text-gray-600">{res.phone || '-'}</td>
                           <td className="border-b px-6 py-4 text-sm text-gray-500">
                             -
                           </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>
              )}
            </div>
                     </div>
         ) : (
           <div className="text-center py-12">
             <p className="text-gray-500">Δεν υπάρχουν δεδομένα κατοίκων.</p>
           </div>
         )
       )}
    </div>
  );
} 