'use client';

import React, { useState, useMemo } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useRequests } from '@/hooks/useRequests';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import type { UserRequest } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2, Filter, Search, X } from 'lucide-react';
import { deleteUserRequest } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import RequestCard from '@/components/RequestCard';
import RequestSkeleton from '@/components/RequestSkeleton';
import { motion } from 'framer-motion';
import { MAINTENANCE_CATEGORIES, PRIORITY_LEVELS, REQUEST_STATUSES } from '@/types/userRequests';

export default function RequestsPage() {
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

  // Χρησιμοποιούμε το selectedBuilding για φιλτράρισμα
  // Αν είναι null, σημαίνει "όλα τα κτίρια" και περνάμε null στο API
  const buildingId = selectedBuilding?.id ?? null;
  const canDelete = user?.is_superuser || user?.is_staff;
  const canCreateRequest = true; // Όλοι οι χρήστες μπορούν να δημιουργήσουν αιτήματα

  const {
    data: requests = [],
    isLoading,
    isError,
    isSuccess,
  } = useRequests(buildingId);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // Search term filter
      if (searchTerm && !request.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !request.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (statusFilter && request.status !== statusFilter) {
        return false;
      }
      
      // Priority filter
      if (priorityFilter && request.priority !== priorityFilter) {
        return false;
      }
      
      // Category filter
      if (categoryFilter && request.maintenance_category !== categoryFilter && request.type !== categoryFilter) {
        return false;
      }
      
      return true;
    });
  }, [requests, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter || priorityFilter || categoryFilter;

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
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Σφάλμα κατά τη διαγραφή του αιτήματος');
    } finally {
      setDeletingId(null);
    }
  };

  const container = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🔧 Αιτήματα Συντήρησης</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Φίλτρα
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {[searchTerm, statusFilter, priorityFilter, categoryFilter].filter(Boolean).length}
              </span>
            )}
          </Button>
          {canCreateRequest && (
            <Link href="/requests/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                ➕ Νέο Αίτημα
              </Button>
            </Link>
          )}
        </div>
      </div>

      <BuildingFilterIndicator />

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-lg shadow-sm border p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Φίλτρα Αναζήτησης</h3>
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-1" />
                Καθαρισμός
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Αναζήτηση
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Τίτλος ή περιγραφή..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Κατάσταση
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Προτεραιότητα
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Κατηγορία
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        </motion.div>
      )}

      {/* Results Summary */}
      {hasActiveFilters && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Εμφανίζονται <strong>{filteredRequests.length}</strong> από <strong>{requests.length}</strong> αιτήματα
            {searchTerm && ` που περιέχουν "${searchTerm}"`}
          </p>
        </div>
      )}

      {/* No Results */}
      {isSuccess && filteredRequests.length === 0 && (
        <div className="text-center text-gray-500 space-y-2 py-8">
          {hasActiveFilters ? (
            <>
              <p>Δεν βρέθηκαν αιτήματα με τα επιλεγμένα φίλτρα.</p>
              <Button onClick={clearFilters} variant="outline" size="sm">
                Καθαρισμός φίλτρων
              </Button>
            </>
          ) : (
            <>
              <p>Δεν υπάρχουν διαθέσιμα αιτήματα.</p>
              {canCreateRequest && (
                <p className="text-sm text-gray-400">
                  Δημιουργήστε το πρώτο αίτημα για να ξεκινήσετε.
                </p>
              )}
            </>
          )}
        </div>
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
            className="p-4 border rounded-lg shadow-sm bg-white space-y-1 relative"
          >
            {/* Building badge - show only when viewing all buildings */}
            {!selectedBuilding && request.building_name && (
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium shadow-sm">
                  🏢 {request.building_name}
                </span>
              </div>
            )}
            
            {canDelete && (
              <button
                onClick={() => handleDelete(request)}
                disabled={deletingId === request.id}
                className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 z-10"
                title="Διαγραφή αιτήματος"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className={`${!selectedBuilding && request.building_name ? 'pt-8' : ''}`}>
              <RequestCard request={request} />
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Floating Action Button for mobile/better UX */}
      {canCreateRequest && (
        <Link 
          href="/requests/new"
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
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
