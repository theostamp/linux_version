'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef,
  useMemo,
} from 'react';
import type { Building } from '@/lib/api';
import { fetchAllBuildings, fetchMyBuildings, api } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

// ========================================================================
// NEW: Enhanced types for Building Context with Permissions
// ========================================================================

/**
 * Permissions για ένα συγκεκριμένο building.
 * Αντιστοιχεί στο BuildingPermissions από το backend.
 */
export interface BuildingPermissions {
  can_edit: boolean;
  can_delete: boolean;
  can_manage_financials: boolean;
  can_view: boolean;
}

/**
 * Enhanced Building Context με financial settings και permissions.
 * Αντιστοιχεί στο BuildingDTO από το backend.
 */
export interface BuildingContextData {
  id: number;
  name: string;
  apartments_count: number;
  trial_ends_at?: string | null;
  premium_enabled?: boolean;
  iot_enabled?: boolean;
  address: string;
  city: string;
  postal_code: string;

  // Management
  manager_id: number | null;
  internal_manager_name: string;
  internal_manager_phone: string;
  management_office_name: string;
  management_office_phone: string;

  // Financial settings
  current_reserve: number;
  management_fee_per_apartment: number;
  reserve_contribution_per_apartment: number;
  heating_system: string;
  heating_fixed_percentage: number;
  reserve_fund_goal: number | null;
  reserve_fund_duration_months: number | null;
  grace_day_of_month: number;

  // Permissions
  permissions: BuildingPermissions;

  // Billing / Entitlements (tenant-level + building-level)
  billing?: {
    account_type: 'individual' | 'office' | string | null;
    tenant_is_active: boolean | null;
    tenant_on_trial: boolean | null;
    tenant_paid_until: string | null;
    tenant_subscription_active: boolean | null;
    premium_enabled: boolean;
    premium_allowed: boolean | null;
    building_plan_type?: 'web' | 'premium' | 'premium_iot' | string | null;
    building_trial_ends_at?: string | null;
    building_trial_active?: boolean | null;
    building_has_apartments?: boolean | null;
    premium_access?: boolean | null;
    premium_blocked_reason?: string | null;
    kiosk_enabled: boolean | null;
    ai_enabled: boolean | null;
    iot_enabled: boolean | null;
    iot_access?: boolean | null;
  };
}

interface BuildingContextType {
  // Existing
  buildings: Building[];
  currentBuilding: Building | null;
  selectedBuilding: Building | null;
  setCurrentBuilding: (building: Building | null) => void;
  setSelectedBuilding: (building: Building | null) => void;
  setBuildings: React.Dispatch<React.SetStateAction<Building[]>>;
  refreshBuildings: () => Promise<void>;
  isLoading: boolean;
  error: string | null;

  // NEW: Enhanced context data
  buildingContext: BuildingContextData | null;
  permissions: BuildingPermissions | null;
  refreshBuildingContext: () => Promise<void>;

  // NEW: Loading states για context
  isLoadingContext: boolean;
  contextError: string | null;
}

const BuildingContext = createContext<BuildingContextType>({
  // Existing
  buildings: [],
  currentBuilding: null,
  selectedBuilding: null,
  setCurrentBuilding: () => {},
  setSelectedBuilding: () => {},
  setBuildings: () => {},
  refreshBuildings: async () => {},
  isLoading: false,
  error: null,

  // NEW: Enhanced context
  buildingContext: null,
  permissions: null,
  refreshBuildingContext: async () => {},

  // NEW: Loading states
  isLoadingContext: false,
  contextError: null,
});

// Helper functions for localStorage
const getStoredSelectedBuildingId = (): number | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('selectedBuildingId');
  return stored ? parseInt(stored, 10) : null;
};

const setStoredSelectedBuildingId = (buildingId: number | null): void => {
  if (typeof window === 'undefined') return;
  if (buildingId === null) {
    localStorage.removeItem('selectedBuildingId');
  } else {
    localStorage.setItem('selectedBuildingId', buildingId.toString());
  }
};

export const BuildingProvider = ({ children }: { children: ReactNode }) => {
  // Existing state
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  // NEW: Enhanced context state
  const [buildingContext, setBuildingContext] = useState<BuildingContextData | null>(null);
  const [permissions, setPermissions] = useState<BuildingPermissions | null>(null);

  // NEW: Loading states για context
  const [isLoadingContext, setIsLoadingContext] = useState<boolean>(false);
  const [contextError, setContextError] = useState<string | null>(null);

  // NEW: AbortController για request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const { isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Load buildings function - wrapped with useCallback to prevent unnecessary re-renders
  const loadBuildings = useCallback(async (options?: { force?: boolean }) => {
    const shouldSkip =
      authLoading ||
      !user ||
      isLoadingBuildings ||
      (!options?.force && hasInitialized);

    // Enhanced guard clause: prevent duplicate calls unless forced
    if (shouldSkip) {
      return;
    }

    try {
      setIsLoading(true);
      setIsLoadingBuildings(true);

      // IMPORTANT:
      // Residents/internal managers should see ONLY their buildings (via BuildingMembership / apartment links).
      // Office admins/staff can see all buildings in the tenant.
      const role = (user as unknown as { role?: string })?.role;
      const isManagementStaff =
        !!(user as any)?.is_staff ||
        !!(user as any)?.is_superuser ||
        (typeof role === 'string' && ['manager', 'admin', 'office_staff', 'staff'].includes(role));

      const data = isManagementStaff ? await fetchAllBuildings() : await fetchMyBuildings();
      console.log('[BuildingContext] Loaded buildings:', data.length, 'buildings');
      setBuildings(data);

      // Always try to select a building if we have buildings
      if (data.length > 0) {
        // Restore selected building from localStorage or default to first building
        const storedBuildingId = getStoredSelectedBuildingId();
        let buildingToSelect: Building | null = null;

        if (storedBuildingId) {
          // Try to find the stored building
          buildingToSelect = data.find(building => building.id === storedBuildingId) || null;
        }

        // If stored building not found, default to first building
        if (!buildingToSelect) {
          buildingToSelect = data[0];
          console.log(`[BuildingContext] No stored building found, selecting first building: ${buildingToSelect.name} (ID: ${buildingToSelect.id})`);
        } else {
          console.log(`[BuildingContext] Restored stored building: ${buildingToSelect.name} (ID: ${buildingToSelect.id})`);
        }

        setCurrentBuilding(buildingToSelect);
        setSelectedBuilding(buildingToSelect);

        // Update localStorage with the selected building (both keys for compatibility)
        setStoredSelectedBuildingId(buildingToSelect.id);
        // Also update activeBuildingId for backward compatibility with getActiveBuildingId()
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('activeBuildingId', buildingToSelect.id.toString());
        }
        console.log(`[BuildingContext] ✓ Auto-selected building: ${buildingToSelect.name} (ID: ${buildingToSelect.id})`);
      } else {
        // No buildings found - clear selection
        console.warn('[BuildingContext] No buildings found for user');
        setCurrentBuilding(null);
        setSelectedBuilding(null);
        setStoredSelectedBuildingId(null);
      }

      setError(null);
      setHasInitialized(true);
    } catch (err: unknown) {
      setHasInitialized(true); // Mark as initialized even on error to prevent retry loops
      console.error('[BuildingContext] Failed to load buildings:', err);

      const apiError = err as { status?: number; response?: { status?: number }; message?: string };
      if (apiError?.status === 403 || apiError?.response?.status === 403) {
        toast.error("Δεν έχετε δικαίωμα πρόσβασης στα κτίρια. Επικοινωνήστε με τον διαχειριστή.");
      } else if (apiError?.status === 429 || apiError?.response?.status === 429) {
        toast.error("Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε λίγο και δοκιμάστε ξανά.");
      } else {
        toast.error("Αποτυχία φόρτωσης κτιρίων.");
      }
      setError(apiError?.message ?? 'Αποτυχία φόρτωσης κτιρίων');
      setBuildings([]);
      setCurrentBuilding(null);
      setSelectedBuilding(null);
      // Clear stored building ID on error
      setStoredSelectedBuildingId(null);
    } finally {
      setIsLoading(false);
      setIsLoadingBuildings(false);
    }
  }, [authLoading, user, isLoadingBuildings, hasInitialized]);

  // Refresh buildings function
  const refreshBuildings = useCallback(async () => {
    console.log('[BuildingContext] Refreshing buildings...');
    await loadBuildings({ force: true });
  }, [loadBuildings]);

  // NEW: Debounced fetch building context with permissions from new API endpoint
  // Uses a ref to track the debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBuildingContext = useCallback(async (buildingId: number) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoadingContext(true);
      setContextError(null);

      console.log(`[BuildingContext] Fetching context for building ${buildingId}...`);

      const response = await api.get<BuildingContextData>(
        `/buildings/current-context/?building_id=${buildingId}`
      );
      const data = response.data;

      setBuildingContext(data);
      setPermissions(data.permissions);

      console.log('[BuildingContext] Building context loaded:', {
        id: data.id,
        name: data.name,
        permissions: data.permissions,
      });

    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        console.log('[BuildingContext] Request cancelled');
        return;
      }

      console.error('[BuildingContext] Failed to load building context:', err);

      setBuildingContext(null);
      setPermissions(null);

      const errorMessage = err.response?.data?.detail ||
                          err.message ||
                          'Αποτυχία φόρτωσης δεδομένων κτιρίου';
      setContextError(errorMessage);

      // Show toast for non-abort errors
      toast.error(errorMessage);

    } finally {
      setIsLoadingContext(false);
      abortControllerRef.current = null;
    }
  }, []);

  // NEW: Refresh building context
  const refreshBuildingContext = useCallback(async () => {
    if (selectedBuilding?.id) {
      console.log('[BuildingContext] Refreshing building context...');
      await fetchBuildingContext(selectedBuilding.id);
    }
  }, [selectedBuilding?.id, fetchBuildingContext]);

  // NEW: Debounced fetch function
  // Delays fetching by 300ms to avoid rapid API calls during quick building switches
  const debouncedFetchBuildingContext = useMemo(
    () => {
      return (buildingId: number) => {
        // Clear previous debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
          fetchBuildingContext(buildingId);
        }, 300); // 300ms delay
      };
    },
    [fetchBuildingContext]
  );

  // NEW: Auto-fetch context when selectedBuilding changes (with debouncing)
  useEffect(() => {
    if (selectedBuilding?.id) {
      // Use debounced fetch to avoid rapid API calls
      debouncedFetchBuildingContext(selectedBuilding.id);
    } else {
      // Clear context when no building selected
      setBuildingContext(null);
      setPermissions(null);
      setContextError(null);
      setIsLoadingContext(false);

      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }

    // Cleanup function - cancel ongoing requests and timers when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedBuilding?.id, debouncedFetchBuildingContext]);

  // Custom setSelectedBuilding that also updates localStorage
  const setSelectedBuildingWithStorage = useCallback((building: Building | null) => {
    setSelectedBuilding(building);
    setStoredSelectedBuildingId(building?.id || null);
    // Also update activeBuildingId for backward compatibility
    if (typeof window !== 'undefined') {
      if (building?.id) {
        window.localStorage.setItem('activeBuildingId', building.id.toString());
        console.log(`[BuildingContext] Selected building: ${building.name} (ID: ${building.id})`);
      } else {
        window.localStorage.removeItem('activeBuildingId');
      }
    }
  }, [setSelectedBuilding]);

  // Unified effect: Load buildings on mount - only once when auth is ready and user is authenticated AND has a tenant
  // This replaces the previous two separate useEffect hooks to prevent duplicate loading
  useEffect(() => {
    // If auth is ready and no user, stop loading
    if (!authLoading && !user) {
      setIsLoading(false);
      setIsLoadingBuildings(false);
      return;
    }

    const role = (user as unknown as { role?: string })?.role;
    const isManagementStaff =
      !!(user as any)?.is_staff ||
      !!(user as any)?.is_superuser ||
      (typeof role === 'string' && ['manager', 'admin', 'office_staff', 'staff'].includes(role));

    // If auth is ready and user exists but no tenant:
    // - For ultra/admin staff, we still want to load buildings (tenant is resolved via X-Tenant-Host).
    // - For regular users, stop loading (they might not have tenant yet).
    if (!authLoading && user && !user.tenant) {
      if (isManagementStaff) {
        loadBuildings();
      } else {
        console.log('[BuildingContext] User has no tenant, stopping loading');
        setIsLoading(false);
        setIsLoadingBuildings(false);
      }
      return;
    }

    // Only load buildings when:
    // 1. Auth is not loading
    // 2. User is authenticated
    // 3. User has a tenant
    // 4. Buildings are not currently loading
    // 5. Buildings haven't been initialized yet
    if (!authLoading && user && user.tenant && !isLoadingBuildings && !hasInitialized) {
      loadBuildings();
    }
  }, [authLoading, user, isLoadingBuildings, hasInitialized, loadBuildings]);

  // Keep currentBuilding in sync with selectedBuilding
  // Only update if selectedBuilding changes, don't override if it's null (user might want to see "all buildings")
  useEffect(() => {
    if (selectedBuilding && selectedBuilding.id !== currentBuilding?.id) {
      setCurrentBuilding(selectedBuilding);
    }
    // Don't auto-select first building if selectedBuilding is null - let user choose
  }, [selectedBuilding, currentBuilding]);

  // 🔄 AUTO-REFETCH: Invalidate queries όταν αλλάζει το selectedBuilding
  // Αυτό εξασφαλίζει ότι όλα τα δεδομένα ανανεώνονται αυτόματα
  useEffect(() => {
    if (selectedBuilding?.id) {
      console.log(`[BuildingContext] Building changed to ${selectedBuilding.id}, invalidating queries...`);

      // Invalidate όλα τα queries που εξαρτώνται από buildingId
      queryClient.invalidateQueries({
        predicate: (query) => {
          // Invalidate queries που έχουν buildingId στο query key
          const queryKey = query.queryKey as unknown[];
          return queryKey.some(key =>
            Array.isArray(key) ? key.includes(selectedBuilding.id) : false
          ) || (
            // Ή queries που έχουν building-related keys
            typeof queryKey[0] === 'string' && (
              queryKey[0] === 'announcements' ||
              queryKey[0] === 'votes' ||
              queryKey[0] === 'expenses' ||
              queryKey[0] === 'payments' ||
              queryKey[0] === 'apartments' ||
              queryKey[0] === 'monthlyExpenses' ||
              queryKey[0] === 'monthlyBalance' ||
              queryKey[0] === 'meterReadings'
            )
          );
        }
      });

      console.log(`[BuildingContext] ✓ Queries invalidated for building ${selectedBuilding.id}`);
    }
  }, [selectedBuilding?.id, queryClient]);

  useEffect(() => {
    // Μόνο αν υπάρχει σοβαρό error (όχι απλά empty buildings list) κάνουμε redirect
    if (!isLoading && error && error.includes('403')) {
      console.log('[BuildingContext] 403 error detected, redirecting to login');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('selectedBuildingId');
      }
      router.push('/login');
    }
  }, [isLoading, error, router]);

  // Custom setCurrentBuilding that also updates localStorage
  const setCurrentBuildingWithStorage = useCallback((building: Building | null) => {
    setCurrentBuilding(building);
    // Also update activeBuildingId for backward compatibility
    if (typeof window !== 'undefined') {
      if (building?.id) {
        window.localStorage.setItem('activeBuildingId', building.id.toString());
        setStoredSelectedBuildingId(building.id);
      } else {
        window.localStorage.removeItem('activeBuildingId');
        setStoredSelectedBuildingId(null);
      }
    }
  }, [setCurrentBuilding]);

  const contextValue = React.useMemo(
    () => ({
      // Existing
      buildings,
      currentBuilding,
      selectedBuilding,
      setCurrentBuilding: setCurrentBuildingWithStorage,
      setSelectedBuilding: setSelectedBuildingWithStorage,
      setBuildings,
      refreshBuildings,
      isLoading,
      error,

      // NEW: Enhanced context
      buildingContext,
      permissions,
      refreshBuildingContext,

      // NEW: Loading states
      isLoadingContext,
      contextError,
    }),
    [
      buildings,
      currentBuilding,
      selectedBuilding,
      setCurrentBuildingWithStorage,
      setSelectedBuildingWithStorage,
      setBuildings,
      refreshBuildings,
      isLoading,
      error,
      buildingContext,
      permissions,
      refreshBuildingContext,
      isLoadingContext,
      contextError,
    ]
  );

  return (
    <BuildingContext.Provider value={contextValue}>
      {children}
    </BuildingContext.Provider>
  );
};

export const useBuilding = (): BuildingContextType => {
  return useContext(BuildingContext);
};
