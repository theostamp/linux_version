'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Building, Tenant } from '@/lib/api';
import { 
  fetchAllBuildingsPublic, 
  fetchMyBuildings, 
  fetchTenants,
  isUltraAdmin,
  getUltraAdminTenantOverride,
  setUltraAdminTenantOverride 
} from '@/lib/api';
import { 
  Search, 
  Building as BuildingIcon, 
  Check, 
  X, 
  MapPin, 
  Users, 
  ChevronRight, 
  ArrowLeft,
  Globe,
  Shield
} from 'lucide-react';

interface BuildingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingSelect: (building: Building | null) => void;
  selectedBuilding: Building | null;
  currentBuilding?: Building | null;
  onManualBuildingSelect?: (id: number) => void;
}

type ViewMode = 'buildings' | 'tenants';

export default function BuildingSelector({
  isOpen,
  onClose,
  onBuildingSelect,
  selectedBuilding,
  currentBuilding,
  onManualBuildingSelect,
}: BuildingSelectorProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [manualId, setManualId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('buildings');
  // Note: selectedTenant is currently unused but kept for potential future enhancement
  const [, setSelectedTenant] = useState<Tenant | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Check if user is Ultra Admin
  const isUltraAdminUser = useMemo(() => isUltraAdmin(), []);
  
  // Get current tenant override
  const currentTenantOverride = useMemo(() => getUltraAdminTenantOverride(), []);

  // Read role from localStorage so this component can be used on public routes (e.g. /kiosk-display)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) {
        setUserRole(null);
        return;
      }
      const parsed = JSON.parse(raw) as { role?: string };
      setUserRole(typeof parsed?.role === 'string' ? parsed.role : null);
    } catch {
      setUserRole(null);
    }
  }, []);

  // Determine if user should only see their own buildings (via BuildingMembership)
  // Residents and internal_managers see only their buildings
  // Managers, admins, and office_staff see all buildings in the tenant
  const managerRoles = ['manager', 'admin', 'office_staff'];
  const isManagerOrAdmin = !!userRole && managerRoles.includes(userRole);
  // If role is unknown (public routes), default to all buildings
  const shouldUseMyBuildings = !!userRole && !isManagerOrAdmin;

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBuildings();
      if (isUltraAdminUser) {
        loadTenants();
      }
    }
  }, [isOpen, shouldUseMyBuildings, isUltraAdminUser]);

  const loadTenants = async () => {
    if (!isUltraAdminUser) return;
    
    try {
      console.log('[BuildingSelector] Loading tenants for Ultra Admin');
      const tenantsData = await fetchTenants();
      console.log('[BuildingSelector] Loaded tenants:', tenantsData.length);
      setTenants(tenantsData);
    } catch (error) {
      console.error('Error loading tenants:', error);
      setTenants([]);
    }
  };

  const loadBuildings = async () => {
    setIsLoading(true);
    try {
      // Residents and internal_managers see only their buildings
      // Managers, admins, office_staff see all buildings in tenant
      let buildingsData: Building[];
      if (shouldUseMyBuildings) {
        console.log('[BuildingSelector] Loading user buildings (resident/internal_manager mode)');
        try {
          buildingsData = await fetchMyBuildings();
        } catch (e) {
          console.warn('[BuildingSelector] Failed to load my-buildings; falling back to public buildings', e);
          buildingsData = await fetchAllBuildingsPublic();
        }
      } else {
        console.log('[BuildingSelector] Loading all buildings (public/manager mode)');
        buildingsData = await fetchAllBuildingsPublic();
      }
      console.log('[BuildingSelector] Loaded buildings:', buildingsData.length);
      setBuildings(buildingsData);
    } catch (error) {
      console.error('Error loading buildings:', error);
      setBuildings([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter buildings based on search term
  useEffect(() => {
    if (buildings.length === 0 || isLoading) {
      setFilteredBuildings([]);
      return;
    }
    
    const buildingsToFilter = currentBuilding 
      ? buildings.filter(b => b.id !== currentBuilding.id)
      : buildings;
    
    if (!searchTerm.trim()) {
      if (buildings.length > 0) {
        console.log('[BuildingSelector] Filtered buildings (no search):', buildingsToFilter.length, 'out of', buildings.length);
      }
      setFilteredBuildings(buildingsToFilter);
    } else {
      const filtered = buildingsToFilter.filter(building =>
        building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        building.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (building.city && building.city.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      console.log('[BuildingSelector] Filtered buildings (with search):', filtered.length, 'out of', buildingsToFilter.length);
      setFilteredBuildings(filtered);
    }
  }, [searchTerm, buildings, currentBuilding, isLoading]);

  // Filter tenants based on search term
  useEffect(() => {
    if (tenants.length === 0) {
      setFilteredTenants([]);
      return;
    }
    
    if (!searchTerm.trim()) {
      setFilteredTenants(tenants);
    } else {
      const filtered = tenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.schema_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.primary_domain.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTenants(filtered);
    }
  }, [searchTerm, tenants]);

  // Close modal with ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close modal on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleBuildingSelect = (building: Building | null) => {
    onBuildingSelect(building);
    onClose();
    setSearchTerm('');
    setManualId('');
    setViewMode('buildings');
  };

  const handleTenantSelect = (tenant: Tenant) => {
    console.log('[BuildingSelector] Tenant selected:', tenant.schema_name);
    setSelectedTenant(tenant);
    
    // Set the tenant override and reload
    setUltraAdminTenantOverride(tenant.primary_domain);
    
    // Clear building selection and reload the page
    localStorage.removeItem('selectedBuildingId');
    localStorage.removeItem('activeBuildingId');
    
    onClose();
    
    // Reload to apply new tenant context
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleClearTenantOverride = () => {
    setUltraAdminTenantOverride(null);
    localStorage.removeItem('selectedBuildingId');
    localStorage.removeItem('activeBuildingId');
    onClose();
    
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  // Find current tenant from override
  const currentTenant = currentTenantOverride 
    ? tenants.find(t => t.primary_domain === currentTenantOverride)
    : null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />
      <div 
        className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-24 pointer-events-none"
      >
        <div 
          ref={modalRef}
          className="bg-white dark:bg-popover rounded-xl shadow-xl w-full max-w-md max-h-[calc(100vh-8rem)] overflow-hidden transform transition-all duration-200 border border-slate-200/60 pointer-events-auto"
        >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200/50 bg-muted">
          <div className="flex items-center gap-2">
            {viewMode === 'tenants' ? (
              <>
                <button
                  onClick={() => setViewMode('buildings')}
                  className="text-muted-foreground hover:text-foreground transition-colors mr-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Globe className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-foreground">Επιλογή Tenant</h2>
              </>
            ) : (
              <>
                <BuildingIcon className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Επιλογή Κτιρίου</h2>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ultra Admin Tenant Indicator */}
        {isUltraAdminUser && currentTenantOverride && viewMode === 'buildings' && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-amber-600" />
              <span className="text-amber-800 dark:text-amber-200">
                Tenant: <strong>{currentTenant?.name || currentTenantOverride}</strong>
              </span>
            </div>
            <button
              onClick={handleClearTenantOverride}
              className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 underline"
            >
              Καθαρισμός
            </button>
          </div>
        )}

        {/* Search */}
        <div className="p-4 border-b border-slate-200/50 bg-white dark:bg-popover">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder={viewMode === 'tenants' ? "Αναζήτηση tenant..." : "Αναζήτηση κτιρίου..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md shadow-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          {/* Manual ID input - only for managers/admins/office_staff */}
          {viewMode === 'buildings' && onManualBuildingSelect && !shouldUseMyBuildings && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="ID κτιρίου (χειροκίνητα)"
                className="w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  const idNum = Number(manualId);
                  if (Number.isFinite(idNum) && idNum > 0) {
                    onManualBuildingSelect(idNum);
                    onClose();
                    setManualId('');
                  }
                }}
                className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded-md shadow-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
                disabled={!manualId}
              >
                ΟΚ
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              {viewMode === 'tenants' ? 'Φόρτωση tenants...' : 'Φόρτωση κτιρίων...'}
            </div>
          ) : viewMode === 'tenants' ? (
            /* Tenants List (Ultra Admin only) */
            <>
              {filteredTenants.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchTerm ? 'Δεν βρέθηκαν tenants' : 'Δεν υπάρχουν διαθέσιμα tenants'}
                </div>
              ) : (
                filteredTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    onClick={() => handleTenantSelect(tenant)}
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      currentTenantOverride === tenant.primary_domain ? 'bg-amber-50 dark:bg-amber-900/20 border-r-4 border-amber-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center shadow-sm ${
                        tenant.on_trial 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-emerald-500 text-white'
                      }`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {tenant.name}
                          {tenant.on_trial && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Trial
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {tenant.primary_domain}
                          <span className="mx-1">•</span>
                          {tenant.buildings_count} κτίρια
                        </div>
                      </div>
                    </div>
                    {currentTenantOverride === tenant.primary_domain && (
                      <Check className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                ))
              )}
            </>
          ) : (
            /* Buildings List */
            <>
              {/* Ultra Admin: Switch Tenant button */}
              {isUltraAdminUser && (
                <>
                  <div
                    onClick={() => {
                      setSearchTerm('');
                      setViewMode('tenants');
                    }}
                    className="flex items-center justify-between p-4 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer transition-colors border-b border-slate-200/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center shadow-sm text-white">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          Αλλαγή Tenant
                          <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 rounded-full">
                            Ultra Admin
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {tenants.length} διαθέσιμα tenants
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </>
              )}

              {/* Επιλογή "Όλα" - Hidden for residents/internal_managers with single building */}
              {(!shouldUseMyBuildings || buildings.length > 1) && (
                <>
                  <div
                    onClick={() => handleBuildingSelect(null)}
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedBuilding === null ? 'bg-primary/5 border-r-4 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shadow-sm text-primary-foreground">
                        <BuildingIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {shouldUseMyBuildings ? 'Όλες οι ιδιοκτησίες μου' : 'Όλα τα Κτίρια'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {shouldUseMyBuildings 
                            ? `Προβολή και των ${buildings.length} κτιρίων`
                            : 'Προβολή όλων των κτιρίων'
                          }
                        </div>
                      </div>
                    </div>
                    {selectedBuilding === null && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>

                  {/* Διαχωριστική γραμμή */}
                  <div className="border-t border-slate-200/50 mx-4"></div>
                </>
              )}

              {/* Τρέχον κτίριο (αν υπάρχει) */}
              {currentBuilding && (
                <>
                  <div className="px-4 py-2 bg-muted border-b border-slate-200/50">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Τρέχον κτίριο
                    </div>
                  </div>
                  <div
                    onClick={() => handleBuildingSelect(currentBuilding)}
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedBuilding?.id === currentBuilding.id ? 'bg-success/10 border-r-4 border-success' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-success rounded-md flex items-center justify-center shadow-sm text-success-foreground">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {currentBuilding.name}
                          <span className="text-xs bg-success/20 text-success-foreground px-2 py-1 rounded-full border border-success/20">
                            Τρέχον
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {currentBuilding.address}
                          {currentBuilding.city && `, ${currentBuilding.city}`}
                        </div>
                      </div>
                    </div>
                    {selectedBuilding?.id === currentBuilding.id && (
                      <Check className="w-5 h-5 text-success" />
                    )}
                  </div>
                  <div className="border-t border-slate-200/50 mx-4"></div>
                </>
              )}

              {/* Λίστα κτιρίων */}
              <div className="px-4 py-2 bg-muted border-b border-slate-200/50">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {shouldUseMyBuildings 
                    ? (currentBuilding ? 'Άλλες ιδιοκτησίες' : 'Οι ιδιοκτησίες μου')
                    : 'Άλλα κτίρια'
                  }
                </div>
              </div>
              {filteredBuildings.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchTerm ? 'Δεν βρέθηκαν κτίρια' : (
                    isUltraAdminUser && !currentTenantOverride 
                      ? 'Επιλέξτε πρώτα ένα tenant για να δείτε κτίρια'
                      : 'Δεν υπάρχουν διαθέσιμα κτίρια'
                  )}
                </div>
              ) : (
                filteredBuildings.map((building) => (
                  <div
                    key={building.id}
                    onClick={() => handleBuildingSelect(building)}
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedBuilding?.id === building.id ? 'bg-primary/5 border-r-4 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shadow-sm text-primary-foreground">
                        <BuildingIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{building.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {building.address}
                          {building.city && `, ${building.city}`}
                        </div>
                      </div>
                    </div>
                    {selectedBuilding?.id === building.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/50 bg-muted">
          <div className="text-sm text-muted-foreground">
            {viewMode === 'tenants' ? (
              'Επιλέξτε έναν tenant για να δείτε τα κτίριά του'
            ) : shouldUseMyBuildings ? (
              buildings.length > 1 
                ? 'Επιλέξτε ένα κτίριο για προβολή ή "Όλες οι ιδιοκτησίες" για συνολική εικόνα'
                : 'Εμφανίζονται μόνο τα κτίρια στα οποία έχετε πρόσβαση'
            ) : (
              'Επιλέξτε ένα κτίριο για φιλτράρισμα ή "Όλα τα Κτίρια" για προβολή όλων'
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
