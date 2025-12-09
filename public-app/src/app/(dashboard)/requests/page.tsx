'use client';

import React, { useState, useMemo } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useRequests } from '@/hooks/useRequests';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import type { UserRequest } from '@/types/userRequests';
import Link from 'next/link';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { cn } from '@/lib/utils';
import { Plus, Wrench, SlidersHorizontal, MapPin, Building as BuildingIcon, Search, X } from 'lucide-react';
import { deleteUserRequest } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import RequestSkeleton from '@/components/RequestSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { MAINTENANCE_CATEGORIES, PRIORITY_LEVELS, REQUEST_STATUSES } from '@/types/userRequests';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import { hasOfficeAdminAccess } from '@/lib/roleUtils';
import { Badge } from '@/components/ui/badge';

type SelectedBuildingInfo = ReturnType<typeof useBuilding>['selectedBuilding'];

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
  const canDelete = hasOfficeAdminAccess(user);
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
      <div>
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
      <div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-condensed">🔧 Αιτήματα Συντήρησης</h1>
          <p className="text-muted-foreground mt-1">Διαχείριση τεχνικών θεμάτων και αιτημάτων ενοίκων</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={hasActiveFilters ? "default" : "outline"}
            className="gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Φίλτρα</span>
            {hasActiveFilters && (
              <span className="ml-1 bg-background/20 text-current px-1.5 py-0.5 rounded-full text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {canCreateRequest && (
            <Button asChild className="gap-2">
              <Link href="/requests/new">
                <Plus className="w-4 h-4" />
                Νέο Αίτημα
              </Link>
            </Button>
          )}
        </div>
      </div>

      <BuildingFilterIndicator className="mb-2" />

      {/* Building Info Bar if filtering all buildings or specific */}
      <div className="flex flex-wrap gap-2">
        {selectedBuilding === null && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg border border-primary/20">
            <BuildingIcon className="w-4 h-4" />
            <span><strong>Βλέπετε όλα τα κτίρια</strong></span>
          </div>
        )}
        {selectedBuilding && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/30 px-3 py-2 rounded-lg border border-slate-200/50">
            <MapPin className="w-4 h-4" />
            <span>
              Τρέχον κτίριο: <span className="font-medium text-foreground">{selectedBuilding.name}</span>
              {selectedBuilding.address && (
                <span className="ml-2 opacity-70">({selectedBuilding.address})</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-border rounded-xl p-4 space-y-4 overflow-hidden shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">
                  🔍 Αναζήτηση
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Αναζήτηση..."
                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">
                  📊 Κατάσταση
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary h-[42px]"
                >
                  <option value="">Όλες οι καταστάσεις</option>
                  {REQUEST_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">
                  ⚡ Προτεραιότητα
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary h-[42px]"
                >
                  <option value="">Όλες οι προτεραιότητες</option>
                  {PRIORITY_LEVELS.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">
                  🏷️ Κατηγορία
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary h-[42px]"
                >
                  <option value="">Όλες οι κατηγορίες</option>
                  {MAINTENANCE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="pt-4 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                      🔍 "{searchTerm}"
                      <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-800 dark:hover:text-blue-200"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {statusFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                      📊 {REQUEST_STATUSES.find(s => s.value === statusFilter)?.label}
                      <button onClick={() => setStatusFilter('')} className="ml-1 hover:text-green-800 dark:hover:text-green-200"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {priorityFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-medium">
                      ⚡ {PRIORITY_LEVELS.find(p => p.value === priorityFilter)?.label}
                      <button onClick={() => setPriorityFilter('')} className="ml-1 hover:text-yellow-800 dark:hover:text-yellow-200"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {categoryFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                      🏷️ {MAINTENANCE_CATEGORIES.find(c => c.value === categoryFilter)?.label}
                      <button onClick={() => setCategoryFilter('')} className="ml-1 hover:text-purple-800 dark:hover:text-purple-200"><X className="w-3 h-3" /></button>
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
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-sm text-primary font-medium">
            📊 Εμφανίζονται <strong>{filteredRequests.length}</strong> από <strong>{requests.length}</strong> αιτήματα
            {searchTerm && ` που περιέχουν "${searchTerm}"`}
          </p>
        </div>
      )}

      {isSuccess && filteredRequests.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          {hasActiveFilters ? (
            <>
              <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="font-medium mb-4">Δεν βρέθηκαν αιτήματα με τα επιλεγμένα φίλτρα.</p>
              <Button onClick={clearFilters} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Καθαρισμός φίλτρων
              </Button>
            </>
          ) : (
            <>
              <Wrench className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="font-medium mb-4">Δεν υπάρχουν διαθέσιμα αιτήματα.</p>
              {canCreateRequest && (
                <Button asChild>
                  <Link href="/requests/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Δημιουργία πρώτου αιτήματος
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <BentoGrid className="max-w-[1920px] auto-rows-auto gap-4">
          {filteredRequests.map((request: UserRequest) => (
            <BentoGridItem
              key={request.id}
              className="md:col-span-1"
              header={
                <RequestItemContent 
                  request={request}
                  selectedBuilding={selectedBuilding}
                  canDelete={!!canDelete}
                  deletingId={deletingId}
                  handleDelete={handleDelete}
                />
              }
            />
          ))}
        </BentoGrid>
      )}
      
      {/* Floating Action Button */}
      {canCreateRequest && (
        <Link 
          href="/requests/new"
          className="fixed bottom-6 right-6 bg-primary text-primary-foreground p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-50 md:hidden"
          title="Νέο Αίτημα"
        >
          <Plus className="w-6 h-6" />
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

type RequestItemContentProps = {
  request: UserRequest;
  selectedBuilding: SelectedBuildingInfo;
  canDelete: boolean;
  deletingId: number | null;
  handleDelete: (request: UserRequest) => Promise<void> | void;
};

function RequestItemContent({
  request,
  selectedBuilding,
  canDelete,
  deletingId,
  handleDelete,
}: RequestItemContentProps) {
  const {
    id,
    title,
    description,
    status,
    priority,
    maintenance_category,
    building_name,
    created_at,
    location,
    apartment_number,
  } = request;

  const statusInfo =
    REQUEST_STATUSES.find((item) => item.value === status) ??
    { label: status, icon: '📋', color: 'text-muted-foreground' };
  const priorityInfo =
    PRIORITY_LEVELS.find((item) => item.value === priority) ??
    { label: 'Μέτρια', icon: '🟡', color: 'text-yellow-600' };
  const categoryInfo =
    MAINTENANCE_CATEGORIES.find((item) => item.value === maintenance_category || item.value === request.type) ??
    { label: 'Άλλο', icon: '📋', color: 'text-muted-foreground' };

  const isDeleting = deletingId === id;
  const showBuildingInfo = !selectedBuilding && building_name;
  const createdDate = new Date(created_at);
  const formattedCreated = createdDate.toLocaleString('el-GR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const pillClass = (baseColor?: string) =>
    cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold',
      baseColor ?? 'text-muted-foreground border-muted'
    );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl">{categoryInfo.icon}</span>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        {showBuildingInfo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BuildingIcon className="h-4 w-4" />
            <span>{building_name}</span>
          </div>
        )}
        <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={pillClass(statusInfo.color)}>
          <span>{statusInfo.icon}</span>
          {statusInfo.label}
        </Badge>
        <Badge variant="outline" className={pillClass(priorityInfo.color)}>
          <span>{priorityInfo.icon}</span>
          {priorityInfo.label}
        </Badge>
        <Badge variant="outline" className={pillClass(categoryInfo.color)}>
          {categoryInfo.label}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Wrench className="h-4 w-4" />
          {formattedCreated}
        </span>
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {location}
          </span>
        )}
        {apartment_number && (
          <span className="flex items-center gap-1">
            Διαμέρισμα {apartment_number}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/requests/${id}`} className="text-sm font-medium text-primary hover:underline">
          Προβολή αιτήματος
        </Link>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(request)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Διαγραφή...' : 'Διαγραφή'}
          </Button>
        )}
      </div>
    </div>
  );
}

