import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Types for events
export interface Event {
  id: number;
  title: string;
  description: string;
  event_type: string;
  priority: string;
  status: string;
  building: {
    id: number;
    name: string;
  };
  scheduled_date?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
  is_urgent_priority: boolean;
  status_icon: string;
  type_icon: string;
  event_type_display: string;
  priority_display: string;
  status_display: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

interface EventsFilters {
  building?: number;
  filter?: 'all' | 'today' | 'week' | 'overdue';
  event_type?: string;
  priority?: string;
  status?: string;
}

interface CalendarEventsFilters {
  building?: number;
  start_date?: string;
  end_date?: string;
}

interface CreateEventData {
  title: string;
  description?: string;
  event_type: string;
  priority: string;
  building_id: number;
  scheduled_date?: string;
  due_date?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

// API functions
const eventsApi = {
  getEvents: async (filters: EventsFilters = {}): Promise<Event[]> => {
    const params = new URLSearchParams();
    
    if (filters.building) params.append('building', filters.building.toString());
    if (filters.event_type) params.append('event_type', filters.event_type);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.status) params.append('status', filters.status);
    
    // Handle special filters
    if (filters.filter) {
      const now = new Date();
      
      switch (filters.filter) {
        case 'today':
          // Events scheduled for today
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
          params.append('scheduled_date__gte', todayStart);
          params.append('scheduled_date__lt', todayEnd);
          break;
          
        case 'week':
          // Events for the next 7 days
          const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          params.append('scheduled_date__gte', now.toISOString());
          params.append('scheduled_date__lt', weekEnd);
          break;
          
        case 'overdue':
          // Events that are past due date (εκπρόθεσμα)
          params.append('due_date__lt', now.toISOString());
          params.append('status', 'pending');  // Only pending events can be overdue
          break;
      }
    }
    
    const response = await api.get(`/events/?${params.toString()}`);
    return response.data.results || response.data;
  },

  getCalendarEvents: async (filters: CalendarEventsFilters = {}): Promise<Event[]> => {
    const params = new URLSearchParams();
    
    if (filters.building) params.append('building', filters.building.toString());
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get(`/events/calendar_view/?${params.toString()}`);
    return response.data;
  },

  getPendingCount: async (buildingId?: number): Promise<{ pending_count: number }> => {
    const params = new URLSearchParams();
    if (buildingId) params.append('building', buildingId.toString());
    
    console.log(`[EVENTS API] Fetching pending count for building: ${buildingId}`);
    const startTime = Date.now();
    
    try {
      const response = await api.get(`/events/pending_count/?${params.toString()}`);
      const duration = Date.now() - startTime;
      console.log(`[EVENTS API] Pending count response received in ${duration}ms:`, response.data);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[EVENTS API] Error fetching pending count after ${duration}ms:`, error);
      throw error;
    }
  },

  createEvent: async (eventData: CreateEventData): Promise<Event> => {
    const response = await api.post('/events/', eventData);
    return response.data;
  },

  updateEvent: async (id: number, eventData: Partial<CreateEventData>): Promise<Event> => {
    const response = await api.patch(`/events/${id}/`, eventData);
    return response.data;
  },

  markCompleted: async (id: number): Promise<Event> => {
    const response = await api.post(`/events/${id}/mark_completed/`);
    return response.data;
  },

  markInProgress: async (id: number): Promise<Event> => {
    const response = await api.post(`/events/${id}/mark_in_progress/`);
    return response.data;
  }
};

// React Query hooks
export const useEvents = (filters: EventsFilters = {}) => {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsApi.getEvents(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes 
    refetchInterval: false, // Disable automatic refetching
    refetchIntervalInBackground: false, // Don't refetch when tab is not visible
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false // Don't refetch on reconnect
  });
};

export const useCalendarEvents = (filters: CalendarEventsFilters = {}, options: any = {}) => {
  return useQuery({
    queryKey: ['events', 'calendar', filters],
    queryFn: () => eventsApi.getCalendarEvents(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes 
    refetchInterval: false, // Disable automatic refetching
    refetchIntervalInBackground: false, // Don't refetch when tab is not visible
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    ...options // Spread additional options like 'enabled'
  });
};

export const useEventsPendingCount = (buildingId?: number) => {
  console.log('[useEventsPendingCount] Hook called with buildingId:', buildingId);
  
  return useQuery({
    queryKey: ['events', 'pending-count', buildingId],
    queryFn: () => eventsApi.getPendingCount(buildingId),
    refetchInterval: false, // Disable automatic refetching
    refetchIntervalInBackground: false, // Don't refetch when tab is not visible
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    select: (data) => {
      console.log('[useEventsPendingCount] Data selected:', data);
      return data.pending_count;
    },
    // Add timeout to prevent hanging
    networkMode: 'online' as const,
    // Prevent refetching when buildingId is undefined
    enabled: buildingId !== undefined,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: eventsApi.createEvent,
    onSuccess: () => {
      // Invalidate all events queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateEventData> }) =>
      eventsApi.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
};

export const useMarkEventCompleted = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: eventsApi.markCompleted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
};

export const useMarkEventInProgress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: eventsApi.markInProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
};