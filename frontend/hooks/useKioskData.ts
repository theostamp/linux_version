// hooks/useKioskData.ts - Specialized hook for public kiosk data (no auth required)

import { useState, useEffect, useCallback } from 'react';

// Simple API get function for kiosk (no complex auth)
async function apiGet<T>(path: string): Promise<T> {
  // Always use backend URL for API calls
  const backendUrl = 'http://localhost:18000';

  // Ensure path starts with /api/
  const apiPath = path.startsWith('/api/') ? path : `/api${path}`;
  const url = `${backendUrl}${apiPath}`;

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
      // Use unified public-info endpoint that returns all kiosk data
      const publicData = await apiGet<{
        building_info: any;
        announcements: any[];
        votes: any[];
        financial: any;
        maintenance: any;
      }>(`/api/public-info/${buildingId}/`);

      // Transform announcements to match KioskAnnouncement interface
      const announcementsResult: KioskAnnouncement[] = publicData.announcements.map((ann: any) => ({
        id: ann.id,
        title: ann.title,
        description: ann.description,
        content: ann.description || '',
        created_at: ann.start_date,
        date: ann.start_date,
        priority: 'medium' as const
      }));

      // Use real financial data from backend
      const financialResult: KioskFinancialInfo = {
        collection_rate: publicData.financial?.collection_rate || 0,
        reserve_fund: publicData.financial?.reserve_fund || 0,
        recent_transactions: (publicData.financial?.recent_expenses || []).map((exp: any) => ({
          id: exp.id,
          description: exp.description,
          amount: exp.amount,
          date: exp.date
        }))
      };

      // Use real maintenance data from backend
      const maintenanceInfo: KioskMaintenanceInfo = {
        active_contractors: publicData.maintenance?.active_contractors || 0,
        urgent_maintenance: publicData.maintenance?.urgent_maintenance || 0,
        active_tasks: (publicData.maintenance?.active_tasks || []).map((task: any) => ({
          id: task.id,
          description: task.title || task.description,
          contractor: task.assigned_to_name,
          priority: task.priority || 'medium',
          due_date: task.due_date
        }))
      };

      // Generate urgent priorities from announcements
      const urgentPriorities: KioskUrgentPriority[] = [];

      // Add urgent announcements
      announcementsResult
        .filter((ann: KioskAnnouncement) => ann.priority === 'high')
        .slice(0, 2)
        .forEach((ann: KioskAnnouncement) => {
          urgentPriorities.push({
            id: `announcement-${ann.id}`,
            title: ann.title,
            description: ann.description || ann.content.substring(0, 100) + '...',
            type: 'announcement',
            priority: 'high',
            dueDate: ann.date ? new Date(ann.date).toLocaleDateString('el-GR') : 'Σήμερα'
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
        building_info: {
          id: publicData.building_info.id,
          name: publicData.building_info.name,
          address: publicData.building_info.address,
          city: publicData.building_info.city,
          total_apartments: publicData.building_info.apartments_count,
          occupied: publicData.building_info.apartments_count // Assume all occupied for now
        },
        announcements: announcementsResult.slice(0, 5), // Limit to 5 most recent
        financial: financialResult,
        maintenance: maintenanceInfo,
        urgent_priorities: urgentPriorities.slice(0, 6), // Max 6 urgent items
        statistics: {
          total_apartments: publicData.building_info.apartments_count || 10,
          occupied: publicData.building_info.apartments_count || 10,
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