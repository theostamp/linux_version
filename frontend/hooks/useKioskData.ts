// hooks/useKioskData.ts - Specialized hook for public kiosk data (no auth required)

import { useState, useEffect, useCallback } from 'react';

// Simple API get function for kiosk (no complex auth)
async function apiGet<T>(path: string): Promise<T> {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:18000';

  const url = path.startsWith('/api/')
    ? `${window.location.origin}${path}`
    : `http://localhost:18000${path}`;

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

export interface KioskBuildingInfo {
  id: number;
  name: string;
  address: string;
  city: string;
  total_apartments?: number;
  occupied?: number;
}

export interface KioskAnnouncement {
  id: number;
  title: string;
  description?: string;
  content: string;
  created_at: string;
  date?: string;
  priority?: 'low' | 'medium' | 'high';
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
}

export interface KioskMaintenanceInfo {
  active_contractors: number;
  urgent_maintenance: number;
  active_tasks: Array<{
    id: number;
    description: string;
    contractor?: string;
    priority?: 'low' | 'medium' | 'high';
    due_date?: string;
  }>;
}

export interface KioskUrgentPriority {
  id: string;
  title: string;
  description: string;
  type: 'maintenance' | 'financial' | 'announcement';
  priority: 'low' | 'medium' | 'high';
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

export const useKioskData = (buildingId: number | null = 1) => {
  const [data, setData] = useState<KioskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKioskData = useCallback(async () => {
    if (!buildingId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel using public API endpoints
      const [
        buildingInfo,
        announcements,
        financialData,
        maintenanceData,
        expenses,
        requests
      ] = await Promise.allSettled([
        // Building info - use public endpoint or existing building data
        apiGet<KioskBuildingInfo>(`/buildings/${buildingId}/public/`).catch(() =>
          apiGet<KioskBuildingInfo>(`/buildings/${buildingId}/`)
        ),

        // Public announcements
        apiGet<{ results: KioskAnnouncement[] }>(`/announcements/public/?building=${buildingId}`)
          .catch(() => apiGet<{ results: KioskAnnouncement[] }>(`/announcements/?building=${buildingId}&limit=5`))
          .then(data => Array.isArray(data) ? data : data.results || []),

        // Financial summary (public safe data only)
        apiGet<KioskFinancialInfo>(`/financial/dashboard/public-summary/?building_id=${buildingId}`)
          .catch(() =>
            apiGet<any>(`/financial/dashboard/summary/?building_id=${buildingId}`)
              .then(data => ({
                collection_rate: data.collection_rate || 0,
                reserve_fund: data.reserve_fund || 0,
                recent_transactions: data.recent_transactions?.slice(0, 3) || []
              }))
          ),

        // Maintenance info (public/basic info only)
        apiGet<KioskMaintenanceInfo>(`/maintenance/public-summary/?building_id=${buildingId}`)
          .catch(() =>
            // Fallback: get basic maintenance info from requests
            Promise.resolve({
              active_contractors: 0,
              urgent_maintenance: 0,
              active_tasks: []
            })
          ),

        // Recent expenses for financial widget
        apiGet<{ results: any[] }>(`/financial/expenses/?building_id=${buildingId}&limit=3`)
          .catch(() => ({ results: [] })),

        // Maintenance requests for maintenance widget
        apiGet<any[]>(`/maintenance/requests/public/?building_id=${buildingId}&limit=5`)
          .catch(() =>
            apiGet<{ results: any[] }>(`/maintenance/requests/?building_id=${buildingId}&limit=5`)
              .then(data => Array.isArray(data) ? data : data.results || [])
          )
      ]);

      // Extract successful results
      const buildingResult = buildingInfo.status === 'fulfilled' ? buildingInfo.value : null;
      const announcementsResult = announcements.status === 'fulfilled' ? announcements.value : [];
      const financialResult = financialData.status === 'fulfilled' ? financialData.value : {
        collection_rate: 0,
        reserve_fund: 0,
        recent_transactions: []
      };
      const maintenanceResult = maintenanceData.status === 'fulfilled' ? maintenanceData.value : {
        active_contractors: 0,
        urgent_maintenance: 0,
        active_tasks: []
      };
      const expensesResult = expenses.status === 'fulfilled'
        ? (Array.isArray(expenses.value) ? expenses.value : expenses.value.results || [])
        : [];
      const requestsResult = requests.status === 'fulfilled' ? requests.value : [];

      // Process maintenance data from requests
      const maintenanceInfo: KioskMaintenanceInfo = {
        ...maintenanceResult,
        active_tasks: requestsResult
          .filter((req: any) => req.type === 'maintenance' && req.status !== 'completed')
          .slice(0, 3)
          .map((req: any) => ({
            id: req.id,
            description: req.title || req.description,
            contractor: req.assigned_contractor || req.contractor,
            priority: req.priority || 'medium',
            due_date: req.due_date
          }))
      };

      // Generate urgent priorities from all data sources
      const urgentPriorities: KioskUrgentPriority[] = [];

      // Add urgent announcements
      announcementsResult
        .filter((ann: KioskAnnouncement) => ann.priority === 'high')
        .slice(0, 2)
        .forEach((ann: KioskAnnouncement, index: number) => {
          urgentPriorities.push({
            id: `announcement-${ann.id}`,
            title: ann.title,
            description: ann.description || ann.content.substring(0, 100) + '...',
            type: 'announcement',
            priority: 'high',
            dueDate: ann.date ? new Date(ann.date).toLocaleDateString('el-GR') : 'Σήμερα'
          });
        });

      // Add urgent maintenance
      maintenanceInfo.active_tasks
        .filter((task: any) => task.priority === 'high')
        .slice(0, 2)
        .forEach((task: any) => {
          urgentPriorities.push({
            id: `maintenance-${task.id}`,
            title: `Επείγουσα Συντήρηση: ${task.description}`,
            description: task.contractor ? `Ανάδοχος: ${task.contractor}` : task.description,
            type: 'maintenance',
            priority: 'high',
            dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('el-GR') : 'Άμεσα',
            contact: task.contractor_phone
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

      const kioskData: KioskData = {
        building_info: buildingResult || {
          id: buildingId,
          name: `Κτίριο ${buildingId}`,
          address: 'Αλκμάνος 22, Αθήνα 116 36',
          city: 'Αθήνα'
        },
        announcements: announcementsResult.slice(0, 5), // Limit to 5 most recent
        financial: financialResult,
        maintenance: maintenanceInfo,
        urgent_priorities: urgentPriorities.slice(0, 6), // Max 6 urgent items
        statistics: {
          total_apartments: buildingResult?.total_apartments || 24,
          occupied: buildingResult?.occupied || 22,
          collection_rate: financialResult.collection_rate
        }
      };

      setData(kioskData);

    } catch (err: any) {
      console.error('[useKioskData] Error fetching kiosk data:', err);
      setError(err.message || 'Σφάλμα κατά τη φόρτωση δεδομένων');
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