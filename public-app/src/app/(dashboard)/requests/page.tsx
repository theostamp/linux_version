'use client';

import React, { useState, useMemo } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useRequests } from '@/hooks/useRequests';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import type { UserRequest } from '@/types/userRequests';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2, Filter, Search, X, SlidersHorizontal, MapPin, Building as BuildingIcon } from 'lucide-react';
import { deleteUserRequest } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import RequestCard from '@/components/RequestCard';
import RequestSkeleton from '@/components/RequestSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { MAINTENANCE_CATEGORIES, PRIORITY_LEVELS, REQUEST_STATUSES } from '@/types/userRequests';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

function RequestsPageContent() {
  const { currentBuilding, selectedBuilding, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady, user } = useAuth();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const buildingId = selectedBuilding?.id ?? null;
  const canDelete = user?.is_superuser || user?.is_staff;
  const canCreateRequest = true;

  const {
    data: requests = [],
    isLoading,
    isError,
    isSuccess,
  } = useRequests(buildingId);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (searchTerm && !request.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !request.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      if (statusFilter && request.status !== statusFilter) {
        return false;
      }
      
      if (priorityFilter && request.priority !== priorityFilter) {
        return false;
      }
      
      if (categoryFilter && request.maintenance_category !== categoryFilter && request.type !== categoryFilter) {
        return false;
      }
      
      return true;
    });
  }, [requests, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || priorityFilter || categoryFilter;
  const activeFilterCount = [searchTerm, statusFilter, priorityFilter, categoryFilter].filter(Boolean).length;

  if (!isAuthReady || buildingLoading || isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔧 Αιτήματα Συντήρησης</h1>
        <BuildingFilterIndicator className="mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <RequestSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔧 Αιτήματα Συντήρησης</h1>
        <BuildingFilterIndicator className="mb-4" />
        <ErrorMessage message="Αδυναμία φόρτωσης αιτημάτων." />
      </div>
    );
  }

  const handleDelete = async (request: UserRequest) => {
    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το αίτημα "${request.title}";`)) {
      return;
    }
    
    setDeletingId(request.id);
    try {
      await deleteUserRequest(request.id);
      toast.success('Το αίτημα διαγράφηκε επιτυχώς');
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['requests'] });
      await queryClient.refetchQueries({ queryKey: ['requests'] });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Σφάλμα κατά τη διαγραφή του αιτήματος');
    } finally {
      setDeletingId(null);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.1
      } 
    },
  };
  
  const item = { 
    hidden: { opacity: 0, y: 20 }, 
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    } 
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">🔧 Αιτήματα Συντήρησης</h1>
          {selectedBuilding === null && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <BuildingIcon className="w-4 h-4" />
              <span>
                <strong>Βλέπετε όλα τα κτίρια</strong>
              </span>
            </div>
          )}
          {selectedBuilding && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <MapPin className="w-4 h-4" />
              <span>
                Τρέχον κτίριο: <span className="font-medium text-gray-800">{selectedBuilding.name}</span>
                {selectedBuilding.address && (
                  <span className="text-gray-500 ml-2">({selectedBuilding.address})</span>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={hasActiveFilters ? "default" : "outline"}
            className={`flex items-center gap-2 transition-all duration-200 flex-1 sm:flex-none ${
              hasActiveFilters 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                : 'hover:bg-gray-50 border-2 border-gray-300 hover:border-blue-400'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Φίλτρα</span>
            <span className="sm:hidden">🔍</span>
            {hasActiveFilters && (
              <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold ${
                hasActiveFilters 
                  ? 'bg-white text-blue-600' 
                  : 'bg-blue-600 text-white'
              }`}>
                {activeFilterCount}
              </span>
            )}
          </Button>
          {canCreateRequest && (
            <Link href="/requests/new">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                ➕ Νέο Αίτημα
              </Button>
            </Link>
          )}
        </div>
      </div>

      <BuildingFilterIndicator />

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border rounded-lg p-4 space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  🔍 Αναζήτηση
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Αναζήτηση..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  📊 Κατάσταση
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Όλες οι καταστάσεις</option>
                  {REQUEST_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.icon} {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  ⚡ Προτεραιότητα
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Όλες οι προτεραιότητες</option>
                  {PRIORITY_LEVELS.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.icon} {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  🏷️ Κατηγορία
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Όλες οι κατηγορίες</option>
                  {MAINTENANCE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      🔍 "{searchTerm}"
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-1 hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {statusFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      📊 {REQUEST_STATUSES.find(s => s.value === statusFilter)?.label}
                      <button
                        onClick={() => setStatusFilter('')}
                        className="ml-1 hover:text-green-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {priorityFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      ⚡ {PRIORITY_LEVELS.find(p => p.value === priorityFilter)?.label}
                      <button
                        onClick={() => setPriorityFilter('')}
                        className="ml-1 hover:text-yellow-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {categoryFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      🏷️ {MAINTENANCE_CATEGORIES.find(c => c.value === categoryFilter)?.label}
                      <button
                        onClick={() => setCategoryFilter('')}
                        className="ml-1 hover:text-purple-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Summary */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4"
        >
          <p className="text-sm text-blue-800">
            📊 Εμφανίζονται <strong>{filteredRequests.length}</strong> από <strong>{requests.length}</strong> αιτήματα
            {searchTerm && ` που περιέχουν "${searchTerm}"`}
          </p>
        </motion.div>
      )}

      {/* No Results */}
      {isSuccess && filteredRequests.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-gray-500 space-y-4 py-12"
        >
          {hasActiveFilters ? (
            <>
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-lg font-medium">Δεν βρέθηκαν αιτήματα με τα επιλεγμένα φίλτρα.</p>
              <p className="text-sm text-gray-400">Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης.</p>
              <Button onClick={clearFilters} variant="outline" size="lg" className="mt-4">
                <X className="w-4 h-4 mr-2" />
                Καθαρισμός φίλτρων
              </Button>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">📋</div>
              <p className="text-lg font-medium">Δεν υπάρχουν διαθέσιμα αιτήματα.</p>
              {canCreateRequest && (
                <p className="text-sm text-gray-400">
                  Δημιουργήστε το πρώτο αίτημα για να ξεκινήσετε.
                </p>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Requests List */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {filteredRequests.map((request: UserRequest) => (
          <motion.div
            key={request.id}
            variants={item}
            className="relative"
          >
            {!selectedBuilding && (request as { building_name?: string }).building_name && (
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium shadow-sm">
                  🏢 {(request as { building_name?: string }).building_name}
                </span>
              </div>
            )}
            
            {canDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(request);
                }}
                disabled={deletingId === request.id}
                className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 z-10"
                title="Διαγραφή αιτήματος"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className={`${!selectedBuilding && (request as { building_name?: string }).building_name ? 'pt-8' : ''}`}>
              <RequestCard request={request} />
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Floating Action Button */}
      {canCreateRequest && (
        <Link 
          href="/requests/new"
          className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-50"
          title="Νέο Αίτημα"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      )}
    </div>
  );
}

export default function RequestsPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <RequestsPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

