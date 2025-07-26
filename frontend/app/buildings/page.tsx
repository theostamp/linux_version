'use client';

import { useState, useMemo } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import BuildingCard from '@/components/BuildingCard';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Building as BuildingIcon, Users, Home, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import ErrorMessage from '@/components/ErrorMessage';

const BuildingsPage = () => {
  const {
    buildings,
    error,
    isLoading,
    setCurrentBuilding,
    setBuildings,
    currentBuilding,
  } = useBuilding();

  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'city' | 'apartments_count'>('name');

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!Array.isArray(buildings)) return { total: 0, totalApartments: 0, cities: 0 };
    
    const totalApartments = buildings.reduce((sum, building) => sum + (building.apartments_count || 0), 0);
    const uniqueCities = new Set(buildings.map(b => b.city)).size;
    
    return {
      total: buildings.length,
      totalApartments,
      cities: uniqueCities
    };
  }, [buildings]);

  // Get unique cities for filter
  const cities = useMemo(() => {
    if (!Array.isArray(buildings)) return [];
    return Array.from(new Set(buildings.map(b => b.city))).sort();
  }, [buildings]);

  // Filter and sort buildings
  const filteredAndSortedBuildings = useMemo(() => {
    if (!Array.isArray(buildings)) return [];
    
    let filtered = buildings;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = buildings.filter(building =>
        building.name.toLowerCase().includes(term) ||
        building.address.toLowerCase().includes(term) ||
        building.city.toLowerCase().includes(term) ||
        (building.internal_manager_name && building.internal_manager_name.toLowerCase().includes(term))
      );
    }

    // Apply city filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(building => building.city === cityFilter);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'city':
          return a.city.localeCompare(b.city);
        case 'apartments_count':
          return (b.apartments_count || 0) - (a.apartments_count || 0);
        default:
          return 0;
      }
    });
  }, [buildings, searchTerm, cityFilter, sortBy]);

  const handleRefresh = () => {
    // Refresh buildings list - this would typically refetch from API
    window.location.reload();
  };

  const canManage = user?.is_superuser || user?.is_staff;

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🏢 Διαχείριση Κτιρίων</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Φόρτωση κτιρίων...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🏢 Διαχείριση Κτιρίων</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!Array.isArray(buildings)) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🏢 Διαχείριση Κτιρίων</h1>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <BuildingIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Δεν βρέθηκαν κτίρια.</p>
          {canManage && (
            <Link href="/buildings/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Δημιουργία Πρώτου Κτιρίου
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">🏢 Διαχείριση Κτιρίων</h1>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              Ανανέωση
            </Button>
            {canManage && (
              <Link href="/buildings/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Νέο Κτίριο
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <BuildingFilterIndicator className="mb-4" />

      {/* Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <BuildingIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Στατιστικά Κτιρίων</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BuildingIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Συνολικά Κτίρια</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Συνολικά Διαμερίσματα</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalApartments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Πόλεις</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.cities}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Αναζήτηση κτιρίου (όνομα, διεύθυνση, πόλη, διαχειριστής)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Όλες οι πόλεις</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Ταξινόμηση:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Όνομα</option>
              <option value="city">Πόλη</option>
              <option value="apartments_count">Αριθμός Διαμερισμάτων</option>
            </select>
          </div>
        </div>
      </div>

      {/* Buildings Grid */}
      <div className="bg-white rounded-lg shadow-sm border">
        {filteredAndSortedBuildings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || cityFilter !== 'all' ? (
              <>
                <p className="mb-4">Δεν βρέθηκαν κτίρια με τα τρέχοντα φίλτρα.</p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setCityFilter('all');
                    }}
                  >
                    Καθαρισμός Φίλτρων
                  </Button>
                </div>
              </>
            ) : (
              <>
                <BuildingIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="mb-4">Δεν υπάρχουν κτίρια.</p>
                {canManage && (
                  <Link href="/buildings/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Δημιουργία Πρώτου Κτιρίου
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedBuildings.map(building => (
              <BuildingCard 
                key={building.id} 
                building={building} 
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Results counter */}
      {filteredAndSortedBuildings.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Εμφανίζονται {filteredAndSortedBuildings.length} από {buildings.length} κτίρια
        </div>
      )}
    </div>
  );
};

export default BuildingsPage;
