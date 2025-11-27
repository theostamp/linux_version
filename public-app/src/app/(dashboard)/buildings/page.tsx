'use client';

import { useState, useMemo, useEffect } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import BuildingCard from '@/components/BuildingCard';
import BuildingTable from '@/components/BuildingTable';
import Pagination from '@/components/Pagination';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { cn } from '@/lib/utils';
import { Plus, Search, Filter, Building as BuildingIcon, Home, TrendingUp, Grid, List } from 'lucide-react';
import Link from 'next/link';
import ErrorMessage from '@/components/ErrorMessage';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';

const BuildingsPageContent = () => {
  const {
    buildings,
    error,
    isLoading,
  } = useBuilding();

  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'city' | 'apartments_count'>('name');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!Array.isArray(buildings)) return { total: 0, totalApartments: 0, cities: 0 };
    
    const totalApartments = buildings.reduce((sum, building) => {
      const apartmentsCount = (building as { total_apartments?: number; apartments_count?: number }).total_apartments || (building as { total_apartments?: number; apartments_count?: number }).apartments_count || 0;
      return sum + apartmentsCount;
    }, 0);
    const uniqueCities = new Set(buildings.map(b => b.city).filter(Boolean)).size;
    
    return {
      total: buildings.length,
      totalApartments,
      cities: uniqueCities
    };
  }, [buildings]);

  // Get unique cities for filter
  const cities = useMemo(() => {
    if (!Array.isArray(buildings)) return [];
    return Array.from(new Set(buildings.map(b => b.city).filter(Boolean))).sort();
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
        (building.city && building.city.toLowerCase().includes(term))
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
          return (a.city || '').localeCompare(b.city || '');
        case 'apartments_count': {
          const aCount = (a as { total_apartments?: number; apartments_count?: number }).total_apartments || (a as { total_apartments?: number; apartments_count?: number }).apartments_count || 0;
          const bCount = (b as { total_apartments?: number; apartments_count?: number }).total_apartments || (b as { total_apartments?: number; apartments_count?: number }).apartments_count || 0;
          return bCount - aCount;
        }
        default:
          return 0;
      }
    });
  }, [buildings, searchTerm, cityFilter, sortBy]);

  // Pagination logic
  const totalItems = filteredAndSortedBuildings.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBuildings = filteredAndSortedBuildings.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cityFilter, sortBy, pageSize]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const canManage = user?.is_superuser || user?.is_staff;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">🏢 Διαχείριση Κτιρίων</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Φόρτωση κτιρίων...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">🏢 Διαχείριση Κτιρίων</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!Array.isArray(buildings)) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">🏢 Διαχείριση Κτιρίων</h1>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-condensed">🏢 Διαχείριση Κτιρίων</h1>
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-secondary/30 rounded-lg p-1">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="text-xs"
              >
                <Grid className="w-4 h-4 mr-1" />
                Κάρτες
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="text-xs"
              >
                <List className="w-4 h-4 mr-1" />
                Λίστα
              </Button>
            </div>
            
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Ανανέωση
            </Button>
            {canManage && (
              <Link href="/buildings/new">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Νέο Κτίριο
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        {/* Filter Indicator */}
        <BuildingFilterIndicator />
        
        {/* Bento Grid Layout */}
        <BentoGrid className="max-w-[1920px] auto-rows-auto gap-4">
          
          {/* Stats Row */}
          <StatCard
            title="Συνολικά Κτίρια"
            value={statistics.total}
            icon={<BuildingIcon className="w-5 h-5" />}
            color="default"
          />
          <StatCard
            title="Συνολικά Διαμερίσματα"
            value={statistics.totalApartments}
            icon={<Home className="w-5 h-5" />}
            color="success"
          />
          <StatCard
            title="Πόλεις"
            value={statistics.cities}
            icon={<TrendingUp className="w-5 h-5" />}
            color="info"
          />

          {/* Filters & Content */}
          <BentoGridItem
            className="md:col-span-3"
            header={
              <div className="space-y-6">
                {/* Filters Bar */}
                <div className="bg-card rounded-xl border border-border/50 p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Search */}
                    <div className="flex-1 relative w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Αναζήτηση κτιρίου (όνομα, διεύθυνση, πόλη)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>

                    {/* City Filter */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <select
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="w-full md:w-auto bg-background border border-input rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary transition-all"
                      >
                        <option value="all">Όλες οι πόλεις</option>
                        {cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Ταξινόμηση:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'city' | 'apartments_count')}
                        className="w-full md:w-auto bg-background border border-input rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary transition-all"
                      >
                        <option value="name">Όνομα</option>
                        <option value="city">Πόλη</option>
                        <option value="apartments_count">Διαμερίσματα</option>
                      </select>
                    </div>

                    {/* Page Size */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Ανά σελίδα:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="w-full md:w-auto bg-background border border-input rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary transition-all"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Buildings Display */}
                {filteredAndSortedBuildings.length === 0 ? (
                  <div className="bg-card rounded-xl border border-dashed p-12 text-center text-muted-foreground">
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
                        <BuildingIcon className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
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
                  <>
                    {/* Cards View */}
                    {viewMode === 'cards' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedBuildings.map(building => (
                          <BuildingCard 
                            key={building.id} 
                            building={building} 
                            onRefresh={handleRefresh}
                          />
                        ))}
                      </div>
                    )}

                    {/* Table View */}
                    {viewMode === 'table' && (
                      <BuildingTable 
                        buildings={paginatedBuildings}
                        onRefresh={handleRefresh}
                      />
                    )}
                  </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-card rounded-xl shadow-sm border p-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}

                {/* Results counter */}
                {filteredAndSortedBuildings.length > 0 && (
                  <div className="text-center text-sm text-muted-foreground">
                    Εμφανίζονται {startIndex + 1}-{Math.min(endIndex, totalItems)} από {totalItems} κτίρια
                  </div>
                )}
              </div>
            }
          />
        </BentoGrid>
      </div>
    </div>
  );
};

const BuildingsPage = () => {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <BuildingsPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
};

export default BuildingsPage;

