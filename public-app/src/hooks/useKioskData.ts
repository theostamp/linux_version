'use client';

// hooks/useKioskData.ts - Specialized hook for public kiosk data (no auth required)

import { useState, useEffect, useCallback } from 'react';

// Simple API get function for kiosk (no complex auth).
// It calls a relative Next.js API route, which then proxies the request to the backend.
async function apiGet<T>(path: string): Promise<T> {
  // Call the relative Next.js API route, not the backend directly.
  const url = path;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

type PriorityLevel = 'low' | 'medium' | 'high';

export interface KioskBuildingInfo {
  id: number;
  name: string;
  address: string;
  city: string;
  total_apartments?: number;
  occupied?: number;
  office_logo?: string | null;
  management_office_name?: string | null;
  management_office_phone?: string | null;
  management_office_address?: string | null;
  internal_manager_name?: string | null;
  internal_manager_phone?: string | null;
}

export interface KioskAnnouncement {
  id: number;
  title: string;
  description?: string;
  content: string;
  created_at: string;
  date?: string;
  start_date?: string;  // For assembly countdown
  end_date?: string;    // For filtering
  priority?: PriorityLevel;
}

export interface KioskFinancialInfo {
  collection_rate: number;
  reserve_fund: number;
  recent_transactions: Array<{
    id: number;
    description: string;
    amount: number;
    date?: string;
  }>;
  total_expenses?: number;
  pending_payments?: number;
  overdue_payments?: number;
  total_payments?: number;
  total_obligations?: number;
  current_obligations?: number;
  top_debtors?: Array<{
    apartment_number?: string;
    amount?: number;
    net_obligation?: number;
    occupant_name?: string | null;
    owner_name?: string | null;
    tenant_name?: string | null;
    status?: string;
  }>;
  apartment_balances?: Array<{
    apartment_number?: string;
    net_obligation?: number;
    owner_name?: string | null;
    tenant_name?: string | null;
    status?: string;
  }>;
}

export interface KioskMaintenanceInfo {
  active_contractors: number;
  urgent_maintenance: number;
  active_tasks: Array<{
    id: number;
    description: string;
    contractor?: string;
    priority?: PriorityLevel;
    due_date?: string;
  }>;
}

export interface KioskUrgentPriority {
  id: string;
  title: string;
  description: string;
  type: 'maintenance' | 'financial' | 'announcement';
  priority: PriorityLevel;
  dueDate: string;
  contact?: string;
  amount?: number;
}

export interface KioskData {
  building_info: KioskBuildingInfo;
  announcements: KioskAnnouncement[];
  financial: KioskFinancialInfo;
  maintenance: KioskMaintenanceInfo;
  urgent_priorities: KioskUrgentPriority[];
  statistics: {
    total_apartments: number;
    occupied: number;
    collection_rate: number;
  };
}

interface PublicAnnouncement {
  id: number;
  title?: string;
  description?: string;
  created_at?: string;
  start_date?: string;
  end_date?: string;
  is_urgent?: boolean;
  priority?: number;
}

interface PublicExpense {
  id: number;
  description: string;
  amount: number;
  date?: string;
}

interface PublicFinancialInfo {
  collection_rate?: number;
  reserve_fund?: number;
  recent_expenses?: PublicExpense[];
  total_payments?: number;
  pending_payments?: number;
  overdue_payments?: number;
  total_collected?: number;
  total_obligations?: number;
  current_obligations?: number;
  top_debtors?: Array<{
    apartment_number?: string;
    net_obligation?: number;
    amount?: number;
    owner_name?: string | null;
    tenant_name?: string | null;
    occupant_name?: string | null;
    status?: string;
  }>;
  apartment_balances?: Array<{
    apartment_number?: string;
    net_obligation?: number;
    owner_name?: string | null;
    tenant_name?: string | null;
    status?: string;
  }>;
}

interface PublicMaintenanceTask {
  id: number;
  title?: string;
  description?: string;
  assigned_to_name?: string;
  priority?: PriorityLevel;
  due_date?: string;
}

interface PublicMaintenanceInfo {
  active_contractors?: number;
  urgent_maintenance?: number;
  active_tasks?: PublicMaintenanceTask[];
}

interface PublicBuildingInfo extends KioskBuildingInfo {
  apartments_count?: number;
}

interface PublicInfoResponse {
  building_info?: PublicBuildingInfo;
  announcements?: PublicAnnouncement[];
  votes?: unknown[];
  financial?: PublicFinancialInfo;
  financial_info?: PublicFinancialInfo;
  maintenance?: PublicMaintenanceInfo;
}

export const useKioskData = (buildingId: number | null = 1) => {
  const [data, setData] = useState<KioskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKioskData = useCallback(async () => {
    if (buildingId == null) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use unified public-info endpoint that returns all kiosk data
      const publicData = await apiGet<PublicInfoResponse>(`/api/public-info/${buildingId}/`);

      console.log('[useKioskData] API response:', {
        announcementsCount: publicData.announcements?.length || 0,
        announcements: publicData.announcements
      });

      const buildingInfo: PublicBuildingInfo = publicData.building_info ?? {
        id: buildingId,
        name: 'Άγνωστο Κτίριο',
        address: '',
        city: '',
      };

      // Transform announcements to match KioskAnnouncement interface
      const announcementsResult: KioskAnnouncement[] = (publicData.announcements || []).map((announcement) => {
        const priorityScore = typeof announcement.priority === 'number' ? announcement.priority : 0;
        const computedPriority: PriorityLevel = (announcement.is_urgent || priorityScore > 5) ? 'high' : 'medium';
        const description = announcement.description || '';

        return {
          id: announcement.id,
          title: announcement.title || 'Ανακοίνωση',
          description,
          content: description,
          created_at: announcement.created_at || announcement.start_date || new Date().toISOString(),
          date: announcement.start_date || announcement.created_at,
          start_date: announcement.start_date,
          end_date: announcement.end_date,
          priority: computedPriority
        };
      });

      // Use real financial data from backend
      const financialSource = publicData.financial || publicData.financial_info;
      const apartmentBalancesSource = Array.isArray(financialSource?.apartment_balances)
        ? financialSource?.apartment_balances
        : [];
      const topDebtorsSource = Array.isArray(financialSource?.top_debtors)
        ? financialSource?.top_debtors
        : [];
      const financialResult: KioskFinancialInfo = {
        collection_rate: financialSource?.collection_rate || 0,
        reserve_fund: financialSource?.reserve_fund || 0,
        recent_transactions: (financialSource?.recent_expenses || []).map((expense) => ({
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          date: expense.date
        })),
        total_payments: financialSource?.total_payments || 0,
        pending_payments: financialSource?.pending_payments || 0,
        overdue_payments: financialSource?.overdue_payments || 0,
        total_obligations: financialSource?.total_obligations || 0,
        current_obligations: financialSource?.current_obligations || financialSource?.pending_payments || 0,
        apartment_balances: apartmentBalancesSource,
        top_debtors: topDebtorsSource,
      };

      // Use real maintenance data from backend
      const maintenanceSource = publicData.maintenance;
      const maintenanceInfo: KioskMaintenanceInfo = {
        active_contractors: maintenanceSource?.active_contractors || 0,
        urgent_maintenance: maintenanceSource?.urgent_maintenance || 0,
        active_tasks: (maintenanceSource?.active_tasks || []).map((task) => ({
          id: task.id,
          description: task.title || task.description || 'Εργασία συντήρησης',
          contractor: task.assigned_to_name,
          priority: task.priority || 'medium',
          due_date: task.due_date
        }))
      };

      // Generate urgent priorities from announcements
      const urgentPriorities: KioskUrgentPriority[] = [];

      // Add urgent announcements
      announcementsResult
        .filter((announcement) => announcement.priority === 'high')
        .slice(0, 2)
        .forEach((announcement) => {
          const description = announcement.description || announcement.content;
          const snippet = description.length > 100 ? `${description.slice(0, 100)}...` : description;

          urgentPriorities.push({
            id: `announcement-${announcement.id}`,
            title: announcement.title,
            description: snippet || 'Σημαντική ανακοίνωση',
            type: 'announcement',
            priority: 'high',
            dueDate: announcement.date ? new Date(announcement.date).toLocaleDateString('el-GR') : 'Σήμερα'
          });
        });

      // Add financial urgent items
      if (financialResult.collection_rate < 80) {
        urgentPriorities.push({
          id: 'financial-collection',
          title: 'Χαμηλή Εισπραξιμότητα Κοινοχρήστων',
          description: `Ποσοστό εισπραξιμότητας: ${financialResult.collection_rate.toFixed(1)}%`,
          type: 'financial',
          priority: 'medium',
          dueDate: 'Συνεχής παρακολούθηση'
        });
      }

      // Ensure we have some sample urgent priorities if none exist
      if (urgentPriorities.length === 0) {
        urgentPriorities.push({
          id: 'sample-maintenance',
          title: 'Τακτική Συντήρηση Ασανσέρ',
          description: 'Προγραμματισμένη μηνιαία συντήρηση ασανσέρ κτιρίου',
          type: 'maintenance',
          priority: 'medium',
          dueDate: '1 εβδομάδα'
        });
      }

      const totalApartments = buildingInfo.apartments_count ?? buildingInfo.total_apartments ?? 0;

      const kioskData: KioskData = {
        building_info: {
          id: buildingInfo.id,
          name: buildingInfo.name,
          address: buildingInfo.address,
          city: buildingInfo.city,
          total_apartments: totalApartments,
          occupied: buildingInfo.occupied ?? totalApartments,
          office_logo: buildingInfo.office_logo ?? null,
          management_office_name: buildingInfo.management_office_name ?? null,
          management_office_phone: buildingInfo.management_office_phone ?? null,
          management_office_address: buildingInfo.management_office_address ?? null,
          internal_manager_name: buildingInfo.internal_manager_name ?? null,
          internal_manager_phone: buildingInfo.internal_manager_phone ?? null
        },
        announcements: announcementsResult.slice(0, 5), // Limit to 5 most recent
        financial: financialResult,
        maintenance: maintenanceInfo,
        urgent_priorities: urgentPriorities.slice(0, 6), // Max 6 urgent items
        statistics: {
          total_apartments: totalApartments || 10,
          occupied: (buildingInfo.occupied ?? totalApartments) || 10,
          collection_rate: financialResult.collection_rate
        }
      };

      setData(kioskData);

    } catch (err: unknown) {
      console.error('[useKioskData] Error fetching kiosk data:', err);
      const message = err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση δεδομένων';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    fetchKioskData();

    const interval = setInterval(() => {
      fetchKioskData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchKioskData]);

  const refetch = useCallback(() => {
    return fetchKioskData();
  }, [fetchKioskData]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
};
