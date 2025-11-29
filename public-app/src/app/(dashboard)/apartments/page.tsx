'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, RefreshCw, Grid, List, Home, MapPin, ArrowRight, Phone, Mail, Building2, AlertTriangle, UserCheck, UserPlus, Edit, Send, Shield } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import { fetchApartments, ApartmentList, resendInvitation } from '@/lib/api';
import { toast } from 'sonner';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import ErrorMessage from '@/components/ErrorMessage';
import Pagination from '@/components/Pagination';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import EditTenantModal from '@/components/apartments/EditTenantModal';
import EditOwnerModal from '@/components/apartments/EditOwnerModal';
import { Button } from '@/components/ui/button';
import { hasOfficeAdminAccess } from '@/lib/roleUtils';
import { StatCard } from '@/components/ui/stat-card';

type OccupancyFilter = 'all' | 'owner' | 'tenant' | 'vacant';
type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'number' | 'owner' | 'tenant' | 'mills';

const formatDate = (value?: string) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
};

const getOccupancyCategory = (apartment: ApartmentList): OccupancyFilter => {
  if (apartment.tenant_name) return 'tenant';
  if (apartment.owner_name) return 'owner';
  return 'vacant';
};

const getOccupancyBadge = (apartment: ApartmentList) => {
  const category = getOccupancyCategory(apartment);
  switch (category) {
    case 'tenant':
      return <Badge className="bg-indigo-100 text-indigo-800">Με ενοικιαστή</Badge>;
    case 'owner':
      return <Badge className="bg-success/10 text-success">Ιδιοκατοίκηση</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground">Κενό</Badge>;
  }
};

const getStatusBadge = (apartment: ApartmentList) => {
  const status = apartment.status_display || 'Ενεργό';
  const normalized = status.toLowerCase();
  if (normalized.includes('ανενεργ') || normalized.includes('inactive') || normalized.includes('archived')) {
    return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
  }
  if (normalized.includes('εκκρεμ') || normalized.includes('pending')) {
    return <Badge className="bg-amber-100 text-amber-800">{status}</Badge>;
  }
  return <Badge className="bg-primary/10 text-primary">{status}</Badge>;
};

// Check if apartment belongs to internal manager
const isInternalManagerApartment = (apartment: ApartmentList, internalManagerApartment?: string): boolean => {
  if (!internalManagerApartment) return false;
  return apartment.number === internalManagerApartment || 
         apartment.identifier === internalManagerApartment;
};

// Internal Manager Badge Component
const InternalManagerBadge = () => (
  <Badge className="bg-amber-500 text-white flex items-center gap-1">
    <Shield className="w-3 h-3" />
    Εσωτ. Διαχειριστής
  </Badge>
);

// Component για email με ένδειξη καταχώρησης και resend
const EmailWithStatus = ({ 
  email, 
  isRegistered, 
  buildingId,
  apartmentId,
  canInvite,
  isTenant = false
}: { 
  email: string; 
  isRegistered: boolean;
  buildingId?: number;
  apartmentId?: number;
  canInvite?: boolean;
  isTenant?: boolean;
}) => {
  const [isResending, setIsResending] = useState(false);

  const handleResend = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canInvite || !email) return;
    
    setIsResending(true);
    try {
      await resendInvitation({
        email,
        building_id: buildingId,
        assigned_role: isTenant ? 'resident' : undefined
      });
      toast.success('Η πρόσκληση στάλθηκε επιτυχώς');
    } catch (err) {
      const error = err as { 
        response?: { data?: Record<string, string | string[]> }; 
        message?: string;
        detail?: string;
      };
      
      let errorMessage = 'Αποτυχία επαναποστολής πρόσκλησης';
      
      const errorData = error?.response?.data || error;
      if (errorData) {
        if (typeof errorData === 'object') {
          const firstKey = Object.keys(errorData).find(key => 
            key !== 'response' && key !== 'message' && errorData[key]
          );
          if (firstKey) {
            const fieldError = errorData[firstKey];
            if (Array.isArray(fieldError) && fieldError.length > 0) {
              errorMessage = fieldError[0];
            } else if (typeof fieldError === 'string') {
              errorMessage = fieldError;
            }
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' ? errorData.error : String(errorData.error);
          }
        }
      }
      
      if (errorMessage === 'Αποτυχία επαναποστολής πρόσκλησης' && error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <a href={`mailto:${email}`} className="flex items-center gap-1 text-primary hover:underline">
        <Mail className="w-3 h-3" />
        {email}
      </a>
      {isRegistered ? (
        <UserCheck className="w-3.5 h-3.5 text-success" title="Καταχωρημένος χρήστης" />
      ) : canInvite ? (
        <div className="flex items-center gap-1">
          <Link 
            href={`/users?invite=${encodeURIComponent(email)}&building=${buildingId || ''}&apartment=${apartmentId || ''}`}
            className="text-primary hover:text-primary/80 transition-colors"
            title="Πρόσκληση χρήστη"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </Link>
          {isTenant && (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Επαναποστολή πρόσκλησης"
            >
              {isResending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      ) : (
        <UserPlus className="w-3.5 h-3.5 text-muted-foreground" title="Μη καταχωρημένος" />
      )}
    </div>
  );
};

const renderContactBlock = (
  label: string, 
  name?: string, 
  phone?: string, 
  email?: string,
  isRegistered?: boolean,
  buildingId?: number,
  apartmentId?: number,
  canInvite?: boolean,
  isTenant?: boolean
) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
    <p className="text-sm font-medium text-foreground">{name || 'Δεν έχει οριστεί'}</p>
    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-1 text-primary hover:underline">
          <Phone className="w-3 h-3" />
          {phone}
        </a>
      )}
      {email && (
        <EmailWithStatus 
          email={email} 
          isRegistered={isRegistered || false}
          buildingId={buildingId}
          apartmentId={apartmentId}
          canInvite={canInvite}
          isTenant={isTenant}
        />
      )}
      {!phone && !email && <span>Χωρίς στοιχεία επικοινωνίας</span>}
    </div>
  </div>
);

const ApartmentsPageContent = () => {
  const { currentBuilding, selectedBuilding, isLoading: buildingsLoading, error: buildingError } = useBuilding();
  const { user } = useAuth();
  const activeBuilding = selectedBuilding || currentBuilding;
  const buildingId = activeBuilding?.id;
  
  // Get internal manager apartment number from building
  const internalManagerApartment = activeBuilding?.internal_manager_apartment;

  const [apartments, setApartments] = useState<ApartmentList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('number');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [editTenantModalOpen, setEditTenantModalOpen] = useState(false);
  const [editOwnerModalOpen, setEditOwnerModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentList | null>(null);

  const canManage = hasOfficeAdminAccess(user);

  const loadApartments = useCallback(async () => {
    if (!buildingId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchApartments(buildingId);
      setApartments(data);
    } catch (err) {
      console.error('[ApartmentsPage] Error loading apartments', err);
      const apiError = err as { status?: number; response?: { status?: number }; message?: string };
      if (apiError?.status === 404 || apiError?.response?.status === 404) {
        setError('Δεν βρέθηκαν διαμερίσματα για το συγκεκριμένο κτίριο.');
      } else if (apiError?.status === 429 || apiError?.response?.status === 429) {
        setError('Πάρα πολλά αιτήματα. Παρακαλώ δοκιμάστε ξανά σε λίγο.');
      } else {
        setError(apiError?.message ?? 'Σφάλμα κατά τη φόρτωση των διαμερισμάτων.');
      }
      setApartments([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    if (buildingId) {
      loadApartments();
    } else {
      setApartments([]);
    }
  }, [buildingId, loadApartments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, occupancyFilter, statusFilter, sortBy, pageSize]);

  const stats = useMemo(() => {
    if (!apartments.length) {
      return {
        total: 0,
        rented: 0,
        ownerOccupied: 0,
        vacant: 0,
        avgSize: 0,
        totalMills: 0,
      };
    }
    const rented = apartments.filter((apt) => getOccupancyCategory(apt) === 'tenant').length;
    const ownerOccupied = apartments.filter((apt) => getOccupancyCategory(apt) === 'owner').length;
    const vacant = apartments.filter((apt) => getOccupancyCategory(apt) === 'vacant').length;
    const avgSizeRaw =
      apartments.reduce((sum, apt) => sum + (typeof apt.square_meters === 'number' ? apt.square_meters : 0), 0) /
      apartments.length;
    const totalMills = apartments.reduce((sum, apt) => sum + (apt.participation_mills || 0), 0);
    return {
      total: apartments.length,
      rented,
      ownerOccupied,
      vacant,
      avgSize: Number.isFinite(avgSizeRaw) ? Number(avgSizeRaw.toFixed(1)) : 0,
      totalMills: Number(totalMills.toFixed(0)),
    };
  }, [apartments]);

  const filteredApartments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const normalizedFilter = statusFilter;
    return apartments
      .filter((apartment) => {
        const matchesSearch =
          !term ||
          [
            apartment.number,
            apartment.identifier,
            apartment.owner_name,
            apartment.tenant_name,
            apartment.notes,
            apartment.building_name,
            apartment.status_display,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(term));

        if (!matchesSearch) return false;

        const occupancyCategory = getOccupancyCategory(apartment);
        if (occupancyFilter !== 'all' && occupancyCategory !== occupancyFilter) {
          return false;
        }

        const status = (apartment.status_display || '').toLowerCase();
        if (
          normalizedFilter === 'active' &&
          status &&
          (status.includes('ανενεργ') || status.includes('inactive') || status.includes('archived'))
        ) {
          return false;
        }
        if (
          normalizedFilter === 'inactive' &&
          !(status.includes('ανενεργ') || status.includes('inactive') || status.includes('archived'))
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'owner':
            return (a.owner_name || '').localeCompare(b.owner_name || '');
          case 'tenant':
            return (a.tenant_name || '').localeCompare(b.tenant_name || '');
          case 'mills':
            return (b.participation_mills || 0) - (a.participation_mills || 0);
          case 'number':
          default:
            return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
        }
      });
  }, [apartments, searchTerm, occupancyFilter, statusFilter, sortBy]);

  const totalItems = filteredApartments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedApartments = filteredApartments.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  if (buildingsLoading) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin mb-4" />
          <p>Φόρτωση κτιρίων...</p>
        </div>
      </div>
    );
  }

  if (buildingError) {
    return (
      <div>
        <ErrorMessage message={buildingError} />
      </div>
    );
  }

  if (!buildingId) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-none p-8 text-center shadow-md">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">Δεν έχει επιλεγεί κτίριο</h1>
          <p className="text-muted-foreground mb-6">
            Για να δείτε τα διαμερίσματα, επιλέξτε πρώτα ένα κτίριο από την αριστερή στήλη ή δημιουργήστε ένα νέο.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/buildings">
              <Button variant="outline">Προβολή κτιρίων</Button>
            </Link>
            <Link href="/buildings/new">
              <Button>
                Δημιουργία νέου κτιρίου
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-primary font-semibold uppercase tracking-wide">Κτίριο: {activeBuilding?.name}</p>
          <h1 className="text-3xl font-bold text-foreground font-condensed">🏘️ Διαχείριση Διαμερισμάτων</h1>
          <p className="text-muted-foreground mt-1">
            Παρακολουθήστε ιδιοκτήτες, ενοικιαστές και στοιχεία συμμετοχής.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadApartments} disabled={isLoading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Ανανέωση
          </Button>
          <Link href={`/buildings/${buildingId}/dashboard`}>
            <Button variant="outline" size="sm">
              Προβολή κτιρίου
            </Button>
          </Link>
          {canManage && (
            <Link href={`/buildings/${buildingId}/edit`}>
              <Button size="sm">
                Διαχείριση κτιρίου
              </Button>
            </Link>
          )}
        </div>
      </div>

      <BuildingFilterIndicator />

      {/* Bento Grid Layout - Stats Only */}
      <BentoGrid className="max-w-[1920px] auto-rows-auto gap-4 mb-8">
        
        {/* Stats Row */}
        <StatCard
          title="Σύνολο"
          value={stats.total}
          subtitle="διαμερίσματα"
          icon={<Building2 className="w-5 h-5" />}
          color="primary"
        />
        <StatCard
          title="Με ενοικιαστή"
          value={stats.rented}
          subtitle="ενεργά μισθωτήρια"
          icon={<UserCheck className="w-5 h-5" />}
          color="info"
        />
        <StatCard
          title="Ιδιοκατοίκηση"
          value={stats.ownerOccupied}
          subtitle="ιδιοκτήτες"
          icon={<Home className="w-5 h-5" />}
          color="success"
        />
        <StatCard
          title="Μέσο μέγεθος"
          value={stats.avgSize || '—'}
          subtitle="τετραγωνικά μέτρα"
          icon={<Grid className="w-5 h-5" />}
          color="default"
        />
      </BentoGrid>

      {/* Main Content Area - Filters & Table */}
      <div className="space-y-6">
              {/* Filters Bar */}
              <div className="bg-card rounded-xl border border-slate-200/50 p-4 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Αναζήτηση (αριθμός, ιδιοκτήτης, ένοικος, σημειώσεις...)"
                        className="pl-10 bg-background border-input"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <select
                          value={occupancyFilter}
                          onChange={(e) => setOccupancyFilter(e.target.value as OccupancyFilter)}
                          className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                        >
                          <option value="all">Όλοι οι τύποι</option>
                          <option value="owner">Ιδιοκατοικούμενα</option>
                          <option value="tenant">Με ενοικιαστή</option>
                          <option value="vacant">Κενά</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                          className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                        >
                          <option value="all">Όλες οι καταστάσεις</option>
                          <option value="active">Ενεργά</option>
                          <option value="inactive">Ανενεργά</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-2 border-t border-slate-200/50">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ταξινόμηση:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortKey)}
                          className="bg-background border border-input rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary"
                        >
                          <option value="number">Αριθμός Διαμερίσματος</option>
                          <option value="owner">Ιδιοκτήτης (Α-Ω)</option>
                          <option value="tenant">Ένοικος (Α-Ω)</option>
                          <option value="mills">Συμμετοχή (‰)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ανά σελίδα:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="bg-background border border-input rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary"
                        >
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Προβολή:</span>
                      <div className="flex bg-secondary/30 rounded-lg p-1">
                        <Button
                          variant={viewMode === 'table' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('table')}
                          className="h-7 px-3 text-xs"
                        >
                          <List className="w-3.5 h-3.5 mr-1" />
                          Λίστα
                        </Button>
                        <Button
                          variant={viewMode === 'cards' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('cards')}
                          className="h-7 px-3 text-xs"
                        >
                          <Grid className="w-3.5 h-3.5 mr-1" />
                          Κάρτες
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && <ErrorMessage message={error} />}

              {/* Results */}
              {isLoading ? (
                <div className="bg-card rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <p>Φόρτωση διαμερισμάτων...</p>
                  </div>
                </div>
              ) : filteredApartments.length === 0 ? (
                <div className="bg-card rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                  <Home className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="font-medium mb-2">Δεν βρέθηκαν διαμερίσματα με τα τρέχοντα φίλτρα.</p>
                  {searchTerm || occupancyFilter !== 'all' || statusFilter !== 'all' ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setOccupancyFilter('all');
                        setStatusFilter('all');
                      }}
                    >
                      Καθαρισμός φίλτρων
                    </Button>
                  ) : (
                    canManage && (
                      <Link href={`/buildings/${buildingId}/edit`}>
                        <Button>Προσθήκη διαμερίσματος</Button>
                      </Link>
                    )
                  )}
                </div>
              ) : (
                <>
                  {viewMode === 'table' ? (
                    <div className="table-container">
                      <div className="overflow-x-auto">
                        <table className="data-table min-w-[960px]">
                          <thead>
                            <tr>
                              <th>Διαμέρισμα</th>
                              <th>Ιδιοκτήτης</th>
                              <th>Ένοικος / Χρήστης</th>
                              <th>Στοιχεία</th>
                              <th className="text-right">Ενέργειες</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedApartments.map((apartment) => (
                              <tr key={apartment.id}>
                                <td>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center",
                                        isInternalManagerApartment(apartment, internalManagerApartment) 
                                          ? 'bg-amber-100 dark:bg-amber-500/20' 
                                          : 'bg-primary/10'
                                      )}>
                                        {isInternalManagerApartment(apartment, internalManagerApartment) ? (
                                          <Shield className="w-5 h-5 text-amber-600" />
                                        ) : (
                                          <Home className="w-5 h-5 text-primary" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-base font-semibold text-foreground leading-tight">{apartment.number}</p>
                                        <p className="text-xs text-muted-foreground">{apartment.identifier || '—'}</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      {isInternalManagerApartment(apartment, internalManagerApartment) && (
                                        <InternalManagerBadge />
                                      )}
                                      {getOccupancyBadge(apartment)}
                                      {getStatusBadge(apartment)}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">{apartment.owner_name || '—'}</p>
                                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                      {apartment.owner_phone && (
                                        <a href={`tel:${apartment.owner_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                                          <Phone className="w-3 h-3" />
                                          {apartment.owner_phone}
                                        </a>
                                      )}
                                      {apartment.owner_email && (
                                        <EmailWithStatus 
                                          email={apartment.owner_email}
                                          isRegistered={!!apartment.owner_user}
                                          buildingId={buildingId}
                                          apartmentId={apartment.id}
                                          canInvite={canManage}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">
                                      {apartment.tenant_name || apartment.occupant_name || '—'}
                                    </p>
                                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                      {apartment.tenant_phone && (
                                        <a href={`tel:${apartment.tenant_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                                          <Phone className="w-3 h-3" />
                                          {apartment.tenant_phone}
                                        </a>
                                      )}
                                      {apartment.tenant_email && (
                                        <EmailWithStatus 
                                          email={apartment.tenant_email}
                                          isRegistered={!!apartment.tenant_user}
                                          buildingId={buildingId}
                                          apartmentId={apartment.id}
                                          canInvite={canManage}
                                          isTenant={true}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Τ.μ.</p>
                                      <p className="text-sm font-semibold text-foreground">
                                        {typeof apartment.square_meters === 'number' ? apartment.square_meters : '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Συμμετοχή</p>
                                      <p className="text-sm font-semibold text-foreground">
                                        {typeof apartment.participation_mills === 'number'
                                          ? `${apartment.participation_mills}‰`
                                          : '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Όροφος</p>
                                      <p className="text-sm font-semibold text-foreground">
                                        {apartment.floor !== undefined ? apartment.floor : '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Ενημέρωση</p>
                                      <p className="text-sm font-semibold text-foreground">
                                        {formatDate(apartment.updated_at)}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {canManage && (
                                      <>
                                        {apartment.owner_name && (
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                              setSelectedApartment(apartment);
                                              setEditOwnerModalOpen(true);
                                            }}
                                            title="Ενημέρωση ιδιοκτήτη"
                                          >
                                            <Edit className="w-3 h-3" />
                                          </Button>
                                        )}
                                        {(apartment.tenant_name || apartment.is_rented) && (
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                              setSelectedApartment(apartment);
                                              setEditTenantModalOpen(true);
                                            }}
                                            title="Ενημέρωση ενοίκου"
                                          >
                                            <Edit className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    <Link href={`/buildings/${buildingId}/dashboard?highlight=${apartment.id}`}>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <ArrowRight className="w-4 h-4" />
                                      </Button>
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="table-footer">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalItems={totalItems}
                          pageSize={pageSize}
                          onPageChange={setCurrentPage}
                          itemLabel="διαμερίσματα"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {paginatedApartments.map((apartment) => (
                        <div key={apartment.id} className={`bg-card rounded-xl shadow-sm border p-5 space-y-4 hover:shadow-md transition-shadow ${
                          isInternalManagerApartment(apartment, internalManagerApartment) ? 'ring-2 ring-amber-500/50' : ''
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-lg shadow-sm flex items-center justify-center ${
                                isInternalManagerApartment(apartment, internalManagerApartment) 
                                  ? 'bg-amber-500/10' 
                                  : 'bg-primary/10'
                              }`}>
                                {isInternalManagerApartment(apartment, internalManagerApartment) ? (
                                  <Shield className="w-6 h-6 text-amber-600" />
                                ) : (
                                  <Home className="w-6 h-6 text-primary" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Διαμέρισμα</p>
                                <p className="text-2xl font-bold text-foreground">{apartment.number}</p>
                                <p className="text-sm text-muted-foreground">{apartment.identifier || '—'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {isInternalManagerApartment(apartment, internalManagerApartment) && (
                                <InternalManagerBadge />
                              )}
                              {getOccupancyBadge(apartment)}
                              {getStatusBadge(apartment)}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-slate-200/50 py-4">
                            {renderContactBlock(
                              'Ιδιοκτήτης', 
                              apartment.owner_name, 
                              apartment.owner_phone, 
                              apartment.owner_email,
                              !!apartment.owner_user,
                              buildingId,
                              apartment.id,
                              canManage
                            )}
                            {renderContactBlock(
                              'Ένοικος / Χρήστης',
                              apartment.tenant_name || apartment.occupant_name,
                              apartment.tenant_phone || apartment.occupant_phone,
                              apartment.tenant_email || apartment.occupant_email,
                              !!apartment.tenant_user,
                              buildingId,
                              apartment.id,
                              canManage,
                              true // isTenant
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Συμμετοχή</p>
                              <p className="font-semibold text-foreground">
                                {typeof apartment.participation_mills === 'number'
                                  ? `${apartment.participation_mills}‰`
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Τετρ. μέτρα</p>
                              <p className="font-semibold text-foreground">
                                {typeof apartment.square_meters === 'number' ? `${apartment.square_meters} τ.μ.` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Τελευταία ενημέρωση</p>
                              <p className="font-semibold text-foreground">{formatDate(apartment.updated_at)}</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 mt-2">
                            <p className="text-xs text-muted-foreground">
                              Δημιουργήθηκε: {formatDate(apartment.created_at)}
                            </p>
                            <div className="flex gap-2">
                              {canManage && (
                                <>
                                  {apartment.owner_name && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => {
                                        setSelectedApartment(apartment);
                                        setEditOwnerModalOpen(true);
                                      }}
                                      title="Ενημέρωση ιδιοκτήτη"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {(apartment.tenant_name || apartment.is_rented) && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => {
                                        setSelectedApartment(apartment);
                                        setEditTenantModalOpen(true);
                                      }}
                                      title="Ενημέρωση ενοίκου"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                              <Link href={`/buildings/${buildingId}/dashboard?highlight=${apartment.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>


      {/* Edit Tenant Modal */}
      <EditTenantModal
        open={editTenantModalOpen}
        onOpenChange={setEditTenantModalOpen}
        apartment={selectedApartment}
        onSuccess={() => {
          loadApartments();
        }}
      />

      {/* Edit Owner Modal */}
      <EditOwnerModal
        open={editOwnerModalOpen}
        onOpenChange={setEditOwnerModalOpen}
        apartment={selectedApartment}
        onSuccess={() => {
          loadApartments();
        }}
      />
    </div>
  );
};

const ApartmentsPage = () => (
  <AuthGate role="any">
    <SubscriptionGate requiredStatus="any">
      <ApartmentsPageContent />
    </SubscriptionGate>
  </AuthGate>
);

export default ApartmentsPage;
