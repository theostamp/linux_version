/**
 * Google Calendar API Client
 * Handles communication with backend Google Calendar integration endpoints
 */

import { api } from '@/lib/api';

export interface CalendarStatus {
  building_id: number;
  building_name: string;
  google_calendar_enabled: boolean;
  google_calendar_id: string | null;
  calendar_url: string | null;
  events_count: number;
  synced_events: number;
  last_sync: string | null;
}

export interface SyncSettings {
  auto_sync: boolean;
  sync_maintenance: boolean;
  sync_meetings: boolean;
  sync_deadlines: boolean;
  sync_reminders: boolean;
}

export interface ConnectResponse {
  authorization_url: string;
  state: string;
}

export interface SyncResponse {
  message: string;
  synced_count: number;
  error_count: number;
}

/**
 * Google Calendar API Client
 */
export class GoogleCalendarClient {
  
  /**
   * Initiate Google Calendar connection for a building
   */
  static async connect(buildingId: number, redirectUri?: string): Promise<ConnectResponse> {
    const response = await api.post('/integrations/google-calendar/connect/', {
      building_id: buildingId,
      redirect_uri: redirectUri || window.location.href
    });
    
    return response.data;
  }

  /**
   * Disconnect Google Calendar for a building
   */
  static async disconnect(buildingId: number): Promise<void> {
    await api.post('/integrations/google-calendar/disconnect/', {
      building_id: buildingId
    });
  }

  /**
   * Get calendar status for a building or all buildings
   */
  static async getStatus(buildingId?: number): Promise<CalendarStatus | { buildings: CalendarStatus[] }> {
    const params = buildingId ? { building_id: buildingId } : {};
    const response = await api.get('/integrations/google-calendar/status/', { params });
    
    return response.data;
  }

  /**
   * Manually sync events to Google Calendar
   */
  static async sync(buildingId: number): Promise<SyncResponse> {
    const response = await api.post('/integrations/google-calendar/sync/', {
      building_id: buildingId
    });
    
    return response.data;
  }

  /**
   * Test Google Calendar connection
   */
  static async testConnection(): Promise<{ connected: boolean; message?: string; error?: string }> {
    const response = await api.post('/integrations/google-calendar/test/');
    return response.data;
  }

  /**
   * Update sync settings for a building
   */
  static async updateSyncSettings(buildingId: number, settings: SyncSettings): Promise<void> {
    await api.post('/integrations/google-calendar/settings/', {
      building_id: buildingId,
      settings
    });
  }

  /**
   * Redirect to Google OAuth authorization
   */
  static async redirectToGoogleAuth(buildingId: number, redirectUri?: string): Promise<void> {
    try {
      const connectData = await this.connect(buildingId, redirectUri);
      
      // Redirect to Google OAuth
      window.location.href = connectData.authorization_url;
      
    } catch (error) {
      console.error('Failed to initiate Google OAuth:', error);
      throw new Error('Failed to connect to Google Calendar');
    }
  }

  /**
   * Check if setup is complete based on URL parameters
   */
  static checkSetupComplete(): { success: boolean; error?: string } {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('success')) {
      return { success: true };
    }
    
    if (urlParams.has('error')) {
      return { 
        success: false, 
        error: urlParams.get('error') || 'Unknown error occurred'
      };
    }
    
    return { success: false };
  }

  /**
   * Clean up URL parameters after OAuth callback
   */
  static cleanupUrlParams(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('success');
    url.searchParams.delete('error');
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    
    // Update URL without reloading page
    window.history.replaceState({}, document.title, url.toString());
  }
}

/**
 * React Query keys for caching
 */
export const googleCalendarKeys = {
  status: (buildingId?: number) => ['google-calendar', 'status', buildingId].filter(Boolean),
  connection: ['google-calendar', 'connection'],
  sync: (buildingId: number) => ['google-calendar', 'sync', buildingId],
} as const;

/**
 * Utility functions
 */
export const googleCalendarUtils = {
  /**
   * Format last sync time for display
   */
  formatLastSync(lastSync: string | null): string {
    if (!lastSync) return 'Ποτέ';
    
    const syncDate = new Date(lastSync);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - syncDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Τώρα';
    if (diffInMinutes < 60) return `Πριν ${diffInMinutes} λεπτά`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Πριν ${diffInHours} ώρες`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Πριν ${diffInDays} ημέρες`;
  },

  /**
   * Get sync health status based on stats
   */
  getSyncHealth(eventsCount: number, syncedEvents: number): 'healthy' | 'warning' | 'error' {
    if (eventsCount === 0) return 'healthy';
    
    const syncRatio = syncedEvents / eventsCount;
    
    if (syncRatio >= 0.9) return 'healthy';
    if (syncRatio >= 0.7) return 'warning';
    return 'error';
  },

  /**
   * Generate calendar embed URL with custom options
   */
  getEmbedUrl(calendarId: string, options?: {
    height?: number;
    showTitle?: boolean;
    showPrint?: boolean;
    showTabs?: boolean;
    showCalendars?: boolean;
    mode?: 'MONTH' | 'WEEK' | 'AGENDA';
  }): string {
    const params = new URLSearchParams({
      src: calendarId,
      ctz: 'Europe/Athens',
      height: (options?.height || 600).toString(),
      showTitle: options?.showTitle ? '1' : '0',
      showPrint: options?.showPrint ? '1' : '0',
      showTabs: options?.showTabs ? '1' : '0',
      showCalendars: options?.showCalendars ? '1' : '0',
    });
    
    if (options?.mode) {
      params.append('mode', options.mode);
    }
    
    return `https://calendar.google.com/calendar/embed?${params.toString()}`;
  },

  /**
   * Get direct Google Calendar URL
   */
  getPublicUrl(calendarId: string): string {
    return `https://calendar.google.com/calendar/u/0?cid=${calendarId}`;
  }
};