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
  filter?: 'all' | 'pending' | 'overdue' | 'today';
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
      switch (filters.filter) {
        case 'pending':
          params.append('status', 'pending');
          break;
        case 'overdue':
          // This will be handled by a separate endpoint
          break;
        case 'today':
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
          params.append('scheduled_date__gte', todayStart);
          params.append('scheduled_date__lt', todayEnd);
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
    
    const response = await api.get(`/events/pending_count/?${params.toString()}`);
    return response.data;
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
    staleTime: 30000 // 30 seconds
  });
};

export const useCalendarEvents = (filters: CalendarEventsFilters = {}) => {
  return useQuery({
    queryKey: ['events', 'calendar', filters],
    queryFn: () => eventsApi.getCalendarEvents(filters),
    staleTime: 30000
  });
};

export const useEventsPendingCount = (buildingId?: number) => {
  return useQuery({
    queryKey: ['events', 'pending-count', buildingId],
    queryFn: () => eventsApi.getPendingCount(buildingId),
    refetchInterval: 60000, // Refetch every minute
    select: (data) => data.pending_count
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