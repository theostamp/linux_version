/**
 * React hooks for Google Calendar integration
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  GoogleCalendarClient, 
  googleCalendarKeys, 
  type CalendarStatus, 
  type SyncSettings 
} from '@/lib/googleCalendar';

/**
 * Hook to get Google Calendar status for a building
 */
export function useCalendarStatus(buildingId?: number) {
  return useQuery({
    queryKey: googleCalendarKeys.status(buildingId),
    queryFn: () => GoogleCalendarClient.getStatus(buildingId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false, // Disable refetch on reconnect
    enabled: !!buildingId, // Only fetch when buildingId is provided
  });
}

/**
 * Hook to connect Google Calendar
 */
export function useConnectGoogleCalendar() {
  return useMutation({
    mutationFn: ({ buildingId, redirectUri }: { 
      buildingId: number; 
      redirectUri?: string 
    }) => GoogleCalendarClient.redirectToGoogleAuth(buildingId, redirectUri),
    
    onError: (error) => {
      console.error('Google Calendar connection failed:', error);
      toast.error('Αποτυχία σύνδεσης με Google Calendar');
    },
  });
}

/**
 * Hook to disconnect Google Calendar
 */
export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (buildingId: number) => GoogleCalendarClient.disconnect(buildingId),
    
    onSuccess: (_, buildingId) => {
      // Invalidate calendar status
      queryClient.invalidateQueries({ 
        queryKey: googleCalendarKeys.status(buildingId) 
      });
      
      toast.success('Google Calendar αποσυνδέθηκε επιτυχώς');
    },
    
    onError: (error) => {
      console.error('Google Calendar disconnection failed:', error);
      toast.error('Αποτυχία αποσύνδεσης Google Calendar');
    },
  });
}

/**
 * Hook to manually sync calendar
 */
export function useSyncCalendar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (buildingId: number) => GoogleCalendarClient.sync(buildingId),
    
    onSuccess: (data, buildingId) => {
      // Refresh calendar status
      queryClient.invalidateQueries({ 
        queryKey: googleCalendarKeys.status(buildingId) 
      });
      
      // Refresh events data if available
      queryClient.invalidateQueries({ 
        queryKey: ['events'] 
      });
      
      if (data.error_count > 0) {
        toast.warning(`Συγχρονισμός ολοκληρώθηκε με σφάλματα: ${data.synced_count} επιτυχείς, ${data.error_count} αποτυχίες`);
      } else {
        toast.success(`Συγχρονισμός ολοκληρώθηκε: ${data.synced_count} events συγχρονίστηκαν`);
      }
    },
    
    onError: (error) => {
      console.error('Calendar sync failed:', error);
      toast.error('Αποτυχία συγχρονισμού ημερολογίου');
    },
  });
}

/**
 * Hook to test Google Calendar connection
 */
export function useTestConnection() {
  return useMutation({
    mutationFn: () => GoogleCalendarClient.testConnection(),
    
    onSuccess: (data) => {
      if (data.connected) {
        toast.success('Σύνδεση με Google Calendar επιτυχής');
      } else {
        toast.error(`Αποτυχία σύνδεσης: ${data.error || 'Άγνωστο σφάλμα'}`);
      }
    },
    
    onError: (error) => {
      console.error('Connection test failed:', error);
      toast.error('Αποτυχία ελέγχου σύνδεσης');
    },
  });
}

/**
 * Hook to update sync settings
 */
export function useUpdateSyncSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ buildingId, settings }: { 
      buildingId: number; 
      settings: SyncSettings 
    }) => GoogleCalendarClient.updateSyncSettings(buildingId, settings),
    
    onSuccess: (_, { buildingId }) => {
      // Refresh calendar status
      queryClient.invalidateQueries({ 
        queryKey: googleCalendarKeys.status(buildingId) 
      });
      
      toast.success('Ρυθμίσεις συγχρονισμού ενημερώθηκαν');
    },
    
    onError: (error) => {
      console.error('Sync settings update failed:', error);
      toast.error('Αποτυχία ενημέρωσης ρυθμίσεων');
    },
  });
}

/**
 * Hook to handle OAuth callback result
 */
export function useOAuthCallback() {
  const queryClient = useQueryClient();
  
  return {
    checkAndHandle: () => {
      const result = GoogleCalendarClient.checkSetupComplete();
      
      if (result.success) {
        // Clean up URL and show success message
        GoogleCalendarClient.cleanupUrlParams();
        
        // Invalidate all calendar status queries
        queryClient.invalidateQueries({ 
          queryKey: ['google-calendar', 'status'] 
        });
        
        toast.success('Google Calendar συνδέθηκε επιτυχώς!');
        return true;
      }
      
      if (result.error) {
        // Clean up URL and show error message
        GoogleCalendarClient.cleanupUrlParams();
        
        const errorMessages: Record<string, string> = {
          'access_denied': 'Η πρόσβαση στο Google Calendar απορρίφθηκε',
          'oauth_failed': 'Αποτυχία σύνδεσης με Google',
          'invalid_state': 'Μη έγκυρη κατάσταση OAuth',
          'missing_parameters': 'Λείπουν απαιτούμενες παράμετροι',
        };
        
        const message = errorMessages[result.error] || `Σφάλμα σύνδεσης: ${result.error}`;
        toast.error(message);
        return false;
      }
      
      return null; // No callback detected
    }
  };
}

/**
 * Hook for calendar status with extended functionality
 */
export function useCalendarStatusExtended(buildingId?: number) {
  const { data, isLoading, error, refetch } = useCalendarStatus(buildingId);
  
  // Extract building-specific data if we got all buildings
  const buildingStatus = React.useMemo(() => {
    if (!data || !buildingId) return null;
    
    if ('buildings' in data) {
      return data.buildings.find(b => b.building_id === buildingId) || null;
    }
    
    return data as CalendarStatus;
  }, [data, buildingId]);
  
  return {
    status: buildingStatus,
    isLoading,
    error,
    refetch,
    
    // Computed properties
    isConnected: buildingStatus?.google_calendar_enabled && !!buildingStatus?.google_calendar_id,
    syncHealth: buildingStatus ? 
      googleCalendarUtils.getSyncHealth(buildingStatus.events_count, buildingStatus.synced_events) : 
      'unknown',
    lastSyncFormatted: googleCalendarUtils.formatLastSync(buildingStatus?.last_sync || null),
  };
}

// Re-export utils for convenience
import { googleCalendarUtils } from '@/lib/googleCalendar';
export { googleCalendarUtils };

// Re-export types
export type { CalendarStatus, SyncSettings };