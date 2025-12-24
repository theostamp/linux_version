'use client';

// hooks/useKioskData.ts - Specialized hook for public kiosk data (no auth required)

import { useState, useEffect, useCallback, useRef } from 'react';

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
  management_office_phone_emergency?: string | null; // Τηλέφωνο ανάγκης
  management_office_email?: string | null;
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

export interface KioskVote {
  id: number;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  is_urgent?: boolean;
  is_active?: boolean;
  min_participation?: number;
  total_votes?: number;
  participation_percentage?: number;
  is_valid?: boolean;
  eligible_voters_count?: number;
  total_building_mills?: number;
  results?: Record<string, any> | null;
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
  current_month_expenses?: Array<{
    id: number;
    title?: string;
    description: string;
    amount: number;
    date?: string;
    category?: string;
  }>;
  heating_expenses?: Array<{
    id: number;
    title?: string;
    description: string;
    amount: number;
    date?: string;
    category?: string;
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
  apartment_statuses?: Array<{
    apartment_number?: string;
    has_pending?: boolean;
  }>;
  current_month_period?: {
    start?: string;
    end?: string;
    is_fallback?: boolean;
  };
  heating_period?: {
    start?: string;
    end?: string;
    season_label?: string;
    is_fallback?: boolean;
  };
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
  votes?: KioskVote[];
  financial: KioskFinancialInfo;
  maintenance: KioskMaintenanceInfo;
  urgent_priorities: KioskUrgentPriority[];
  ads?: {
    ticker: KioskAd[];
    banner: KioskAd[];
    interstitial: KioskAd[];
  };
  upcoming_assembly?: {
    id: string;
    title: string;
    scheduled_date: string;
    scheduled_time: string | null;
    location?: string | null;
    status?: string;
    is_pre_voting_active?: boolean;
    stats?: {
      total_apartments_invited?: number;
      pre_voted_count?: number;
      pre_voted_percentage?: number;
      voting_items_count?: number;
    };
    agenda_items?: Array<{
      id: string;
      order?: number;
      title: string;
      item_type: string;
      estimated_duration?: number | null;
    }>;
  } | null;
  statistics: {
    total_apartments: number;
    occupied: number;
    collection_rate: number;
  };
}

export interface KioskAd {
  contract_id: number;
  placement: 'ticker' | 'banner' | 'interstitial';
  status: string;
  active_until: string | null;
  trial_ends_at: string | null;
  creative: {
    headline: string;
    body: string;
    ticker_text: string;
    image_url: string;
    cta_url: string;
    creative_status: string;
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
  title?: string;
  description: string;
  amount: number;
  date?: string;
  category?: string;
}

interface PublicFinancialInfo {
  collection_rate?: number;
  reserve_fund?: number;
  recent_expenses?: PublicExpense[];
  current_month_expenses?: PublicExpense[];
  heating_expenses?: PublicExpense[];
  current_month_period?: {
    start?: string;
    end?: string;
    is_fallback?: boolean;
  };
  heating_period?: {
    start?: string;
    end?: string;
    season_label?: string;
    is_fallback?: boolean;
  };
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
  apartment_statuses?: Array<{
    apartment_number?: string;
    has_pending?: boolean;
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
  votes?: Array<{
    id: number;
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    is_urgent?: boolean;
    min_participation?: number;
    created_at?: string;
    total_votes?: number;
    participation_percentage?: number;
    is_valid?: boolean;
    results?: Record<string, any> | null;
  }>;
  financial?: PublicFinancialInfo;
  financial_info?: PublicFinancialInfo;
  maintenance?: PublicMaintenanceInfo;
  upcoming_assembly?: KioskData['upcoming_assembly'];
  ads?: {
    ticker?: KioskAd[];
    banner?: KioskAd[];
    interstitial?: KioskAd[];
  };
}

export const useKioskData = (buildingId: number | null = 1) => {
  const [data, setData] = useState<KioskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchKioskData = useCallback(async () => {
    if (buildingId == null) return;

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      console.log(`[useKioskData] 🏢 Fetching data for building ID: ${buildingId}`);
      
      // Use unified public-info endpoint that returns all kiosk data
      const apiUrl = `/api/public-info/${buildingId}/?month=${currentMonth}`;
      console.log(`[useKioskData] 📡 API URL: ${apiUrl}`);
      
      const publicData = await apiGet<PublicInfoResponse>(apiUrl);

      console.log('[useKioskData] 📦 API response:', {
        buildingId: buildingId,
        requestedBuildingId: buildingId,
        announcementsCount: publicData.announcements?.length || 0,
        hasUpcomingAssembly: !!publicData.upcoming_assembly,
        votesCount: publicData.votes?.length || 0,
        announcements: publicData.announcements?.map(a => ({ 
          id: a.id, 
          title: a.title?.substring(0, 30) 
        }))
      });

      const buildingInfo: PublicBuildingInfo = publicData.building_info ?? {
        id: buildingId,
        name: 'Άγνωστο Κτίριο',
        address: '',
        city: '',
        management_office_email: null,
      };

      // Transform announcements to match KioskAnnouncement interface
      let announcementsResult: KioskAnnouncement[] = (publicData.announcements || []).map((announcement) => {
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

      if (!announcementsResult.length) {
        try {
          const fallbackParams = new URLSearchParams({
            page_size: '5',
            ordering: '-created_at',
          });
          if (buildingId) {
            fallbackParams.set('building', String(buildingId));
          }

          const fallbackResponse = await apiGet<{ results?: PublicAnnouncement[] } | PublicAnnouncement[]>(
            `/api/announcements/?${fallbackParams.toString()}`
          );

          const fallbackAnnouncements = Array.isArray(fallbackResponse)
            ? fallbackResponse
            : fallbackResponse.results || [];

          if (fallbackAnnouncements.length > 0) {
            announcementsResult = fallbackAnnouncements.map((announcement) => {
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
          }
        } catch (fallbackError) {
          // Silently fail - fallback is optional, main data source is public-info endpoint
          console.debug('[useKioskData] Fallback announcements fetch failed (non-critical):', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
        }
      }

      // Transform votes (public-info already filters to active window, but keep as-is)
      const votesResult: KioskVote[] = (publicData.votes || []).map((vote) => ({
        id: vote.id,
        title: vote.title || 'Ψηφοφορία',
        description: vote.description,
        start_date: vote.start_date,
        end_date: vote.end_date,
        created_at: vote.created_at || vote.start_date || new Date().toISOString(),
        is_urgent: vote.is_urgent,
        is_active: (vote as any).is_active ?? true, // Default to active if not specified
        min_participation: vote.min_participation,
        total_votes: vote.total_votes ?? 0,
        participation_percentage: vote.participation_percentage,
        is_valid: vote.is_valid,
        eligible_voters_count: (vote as any).eligible_voters_count,
        total_building_mills: (vote as any).total_building_mills,
        results: vote.results ?? null,
      }));
      
      console.log('[useKioskData] 🗳️ Transformed votes:', votesResult.map(v => ({
        id: v.id,
        title: v.title?.substring(0, 30),
        is_active: v.is_active,
        start_date: v.start_date,
        end_date: v.end_date,
        total_votes: v.total_votes,
        participation_percentage: v.participation_percentage
      })));

      // Use real financial data from backend
      const financialSource = publicData.financial || publicData.financial_info;
      const apartmentBalancesSource = Array.isArray(financialSource?.apartment_balances)
        ? financialSource?.apartment_balances
        : [];
      const apartmentStatusesSource = Array.isArray(financialSource?.apartment_statuses)
        ? financialSource?.apartment_statuses
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
        current_month_expenses: (financialSource?.current_month_expenses || []).map((expense) => ({
          id: expense.id,
          title: expense.title,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          category: expense.category
        })),
        heating_expenses: (financialSource?.heating_expenses || []).map((expense) => ({
          id: expense.id,
          title: expense.title,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          category: expense.category
        })),
        current_month_period: financialSource?.current_month_period,
        heating_period: financialSource?.heating_period,
        total_payments: financialSource?.total_payments || 0,
        pending_payments: financialSource?.pending_payments || 0,
        overdue_payments: financialSource?.overdue_payments || 0,
        total_obligations: financialSource?.total_obligations || 0,
        current_obligations: financialSource?.current_obligations || financialSource?.pending_payments || 0,
        apartment_balances: apartmentBalancesSource,
        apartment_statuses: apartmentStatusesSource,
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
          management_office_phone_emergency: buildingInfo.management_office_phone_emergency ?? null,
          management_office_email: buildingInfo.management_office_email ?? null,
          management_office_address: buildingInfo.management_office_address ?? null,
          internal_manager_name: buildingInfo.internal_manager_name ?? null,
          internal_manager_phone: buildingInfo.internal_manager_phone ?? null
        },
        announcements: announcementsResult.slice(0, 5), // Limit to 5 most recent
        votes: votesResult,
        financial: financialResult,
        maintenance: maintenanceInfo,
        urgent_priorities: urgentPriorities.slice(0, 6), // Max 6 urgent items
        upcoming_assembly: publicData.upcoming_assembly ?? null,
        ads: {
          ticker: Array.isArray(publicData.ads?.ticker) ? publicData.ads!.ticker : [],
          banner: Array.isArray(publicData.ads?.banner) ? publicData.ads!.banner : [],
          interstitial: Array.isArray(publicData.ads?.interstitial) ? publicData.ads!.interstitial : [],
        },
        statistics: {
          total_apartments: totalApartments || 10,
          occupied: (buildingInfo.occupied ?? totalApartments) || 10,
          collection_rate: financialResult.collection_rate
        }
      };

      if (requestId !== requestIdRef.current) return;

      setData(kioskData);

    } catch (err: unknown) {
      console.error('[useKioskData] Error fetching kiosk data:', err);
      const message = err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση δεδομένων';
      if (requestId === requestIdRef.current) {
        setError(message);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [buildingId]);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    let cancelled = false;

    // Clear stale data when switching κτίριο
    setData(null);
    setError(null);

    const run = async () => {
      try {
        await fetchKioskData();
      } catch {
        if (cancelled) return;
      }
    };

    run();

    const interval = setInterval(() => {
      fetchKioskData();
    }, data?.upcoming_assembly?.status === 'in_progress' ? 15 * 1000 : 5 * 60 * 1000); // 15s if live, 5m otherwise

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchKioskData, data?.upcoming_assembly?.status]);

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
