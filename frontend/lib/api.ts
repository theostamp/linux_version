// Helper για όλα τα calls στο backend
import axios, { AxiosResponse, AxiosRequestHeaders, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { UserRequest } from '@/types/userRequests';
export type { UserRequest };
import type { User } from '@/types/user';
import { apiPublic } from './apiPublic';

// Βασικό URL του API. Προσαρμόστε το NEXT_PUBLIC_API_URL στο .env.local ή .env.production
// Χρησιμοποιούμε το tenant subdomain για να πάμε στο σωστό tenant schema
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    console.log(`[API] Current hostname: ${hostname}`);
    
    // Αν είναι tenant subdomain (π.χ. demo.localhost), χρησιμοποιούμε το ίδιο subdomain για το API
    if (hostname.includes('.localhost') && !hostname.startsWith('localhost')) {
      // Χρησιμοποιούμε το port 8000 για το backend
      const apiUrl = `http://${hostname}:8000/api`;
      console.log(`[API] Using tenant-specific API URL: ${apiUrl}`);
      return apiUrl;
    }
  }
  const defaultUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8000/api';
  console.log(`[API] Using default API URL: ${defaultUrl}`);
  return defaultUrl;
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});


// Flag για να αποφύγουμε πολλαπλές προσπάθειες ανανέωσης ταυτόχρονα
let isRefreshing = false;
// Ουρά για αιτήματα που περιμένουν νέο token
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor (για προσθήκη Authorization & CSRF)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
    }
    const access = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
    
    console.log(
      `[AXIOS REQ INTERCEPTOR] URL: ${config.url}`,
      `Token from localStorage: ${access ? 'Υπάρχει (...${access.slice(-10)})' : 'ΔΕΝ υπάρχει ή είναι null'}`
    );

    if (access && access.length > 0 && !config.url?.includes('/users/login/') && !config.url?.includes('/users/token/refresh/')) {
      config.headers.Authorization = `Bearer ${access}`;
      console.log(`[AXIOS REQ INTERCEPTOR] Authorization header ΠΡΟΣΤΕΘΗΚΕ για: ${config.url}`);
    } else if (!config.url?.includes('/users/login/') && !config.url?.includes('/users/token/refresh/')) {
      console.warn(
        `[AXIOS REQ INTERCEPTOR] Authorization header ΔΕΝ ΠΡΟΣΤΕΘΗΚΕ για: ${config.url}.`,
        `Access token: ${access ? 'Υπάρχει αλλά ίσως κενό;' : 'Δεν υπάρχει'}.`,
        `Είναι login/refresh URL: ${config.url?.includes('/users/login/') || config.url?.includes('/users/token/refresh/')}`
      );
    }

    // CSRF Token Logic
    const method = (config.method ?? '').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    console.error('[AXIOS REQ INTERCEPTOR] Σφάλμα στο αίτημα:', error);
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

// Response Interceptor (για χειρισμό ληγμένων tokens)
function shouldAttemptTokenRefresh(
  error: AxiosError,
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean }
): boolean {
  const isLogin = originalRequest?.url?.includes('/users/login/');
  const isRefresh = originalRequest?.url?.includes('/users/token/refresh/');
  const hasAccess = typeof window !== 'undefined' && !!localStorage.getItem('access');
  const hasRefresh = typeof window !== 'undefined' && !!localStorage.getItem('refresh');

  return (
    error.response?.status === 401 &&
    !originalRequest._retry &&
    !isLogin &&
    !isRefresh &&
    hasAccess &&
    hasRefresh
  );
}


function isTokenExpiredError(errorData: any): boolean {
  return errorData?.code === 'token_not_valid' &&
    errorData?.messages?.some(
      (msg: any) =>
        msg.token_class === 'AccessToken' &&
        msg.message?.toLowerCase().includes('expired')
    );
}



api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    console.log('%c[AXIOS RES INTERCEPTOR] Σφάλμα:', 'color: red; font-weight: bold;');
    console.log('Status code:', error.response?.status);
    console.log('Αιτία:', error.response?.data);
    console.log('URL Αρχικού Αιτήματος:', originalRequest?.url);
    console.log('Authorization header:', originalRequest?.headers?.Authorization || originalRequest?.headers?.authorization);
    console.log('[INTERCEPTOR] Replaying original request with new token:', {
      url: originalRequest.url,
      headers: originalRequest.headers,
    });

    if (shouldAttemptTokenRefresh(error, originalRequest)) {
      console.log('[INTERCEPTOR] Προϋποθέσεις για token refresh πληρούνται.');

      const errorData = error.response?.data as any;
      if (!isTokenExpiredError(errorData)) {
        console.warn('[INTERCEPTOR] Το token ΔΕΝ έχει λήξει — πιθανώς πρόβλημα άλλης φύσης. Logout...');
        handleLogout('[AXIOS RES INTERCEPTOR] 401 αλλά όχι για ληγμένο access token. Αποσύνδεση χρήστη.');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        console.log('[INTERCEPTOR] Ήδη γίνεται refresh από άλλο αίτημα — προσθήκη σε ουρά.');
        return queueRequestWhileRefreshing(originalRequest);
      }

      console.log('[INTERCEPTOR] Ξεκινά νέα ανανέωση token...');
      return await handleTokenRefresh(originalRequest, error);
    }

    console.warn('[INTERCEPTOR] Δεν πληρούνται προϋποθέσεις για token refresh ή άλλο σφάλμα. Απόρριψη...');
    return Promise.reject(error);
  }
);



function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  }
  return null;
}


export async function loginUser(
  email: string,
  password: string,
): Promise<{ access: string; refresh: string; user: User }> {
  console.log(`[API CALL] Attempting login for user: ${email}`);
  const { data } = await api.post('/users/login/', { email, password });

  if (typeof window !== 'undefined') {
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('[loginUser] User data saved to localStorage:', data.user);
    }
    console.log('[loginUser] Tokens saved to localStorage:', {
      access: data.access ? `...${data.access.slice(-10)}` : 'NO ACCESS TOKEN RETURNED',
      refresh: data.refresh ? `...${data.refresh.slice(-10)}` : 'NO REFRESH TOKEN RETURNED',
    });
  }
  return data;
}


export async function logoutUser(): Promise<void> {
  console.log('[API CALL] Attempting logout.');
  const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh') : null;
  
  if (refresh) {
    try {
      await axios.post(`${API_BASE_URL}/users/logout/`, { refresh }, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('[logoutUser] Logout request sent to backend.');
    } catch (error) {
      console.error("[logoutUser] Logout API call failed:", error);
    }
  } else {
    console.warn('[logoutUser] No refresh token found in localStorage to send for logout.');
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    console.log('[logoutUser] Tokens and user data cleared from localStorage.');
  }
}

export async function getCurrentUser(): Promise<User> {
  console.log('[API CALL] Attempting to fetch /users/me/');
  const { data } = await api.get<User>('/users/me/');
  if (typeof window !== 'undefined' && data) {
    localStorage.setItem('user', JSON.stringify(data));
  }
  return data;
}

export type Announcement = { 
  id: number; title: string; description: string; file: string | null; 
  start_date: string; end_date: string; is_active: boolean; building: number; // Building ID
  building_name?: string; // Building name
  is_currently_active?: boolean; days_remaining?: number | null; status_display?: string;
  created_at: string; updated_at?: string;
};

export type Vote = { 
  id: number; title: string; description: string; start_date: string; end_date: string; 
  building: number; // Building ID
  building_name?: string; // Building name
  choices?: string[]; is_active?: boolean; created_at?: string; updated_at?: string;
  status_display?: string; creator_name?: string; is_urgent?: boolean;
};

export type VoteSubmission = { 
  vote: number; user: number; choice: string | null; 
};

export type VoteResultsData = { [key: string]: number; total: number; };



export type ObligationSummary = { pending_payments: number; maintenance_tickets: number; };
export type Obligation = {
    id: number;
    title: string;
    description: string;
    amount: string; // Η Django DecimalField συχνά γίνεται string στο JSON
    due_date: string;
    status: 'pending' | 'paid' | 'overdue'; // Πιθανές καταστάσεις
    building: number; // Building ID
    created_at: string;
    updated_at?: string;
    // ... άλλα πεδία που μπορεί να έχει το μοντέλο Obligation
};

// Define the Building type
export type Building = {
  id: number;
  name: string;
  address: string;
  city?: string;
  postal_code?: string;
  apartments_count?: number;
  internal_manager_name?: string;
  internal_manager_phone?: string;
  management_office_name?: string;
  management_office_phone?: string;
  management_office_address?: string;
  created_at: string;
  updated_at?: string;
  street_view_image?: string;
  latitude?: number;
  longitude?: number;
  // Backward compatibility - coordinates field for frontend use
  coordinates?: { lat: number; lng: number };
  // Add other fields as needed based on your backend model
};

export interface BuildingsResponse {
  results: Building[];
  count: number;
  next: string | null;
  previous: string | null;
}

export async function fetchBuildings(page: number = 1, pageSize: number = 50): Promise<BuildingsResponse> {
  console.log(`[API CALL] Attempting to fetch /buildings/ with page=${page}, pageSize=${pageSize}`);
  console.log('[API CALL] Current API base URL:', API_BASE_URL);
  try {
    const resp = await api.get<BuildingsResponse>('/buildings/', {
      params: {
        page,
        page_size: pageSize
      }
    });
    console.log('[API CALL] Fetched buildings response:', resp.data);
    console.log('[API CALL] Response status:', resp.status);
    return resp.data;
  } catch (error) {
    console.error('[API CALL] Error fetching buildings:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('[API CALL] Error response status:', (error as any).response?.status);
      console.error('[API CALL] Error response data:', (error as any).response?.data);
    }
    throw error;
  }
}

// Backward compatibility function
export async function fetchAllBuildings(): Promise<Building[]> {
  console.log('[API CALL] Fetching all buildings (no pagination)');
  try {
    // Try to disable pagination by requesting a very large page size
    const resp = await api.get<{ results?: Building[] } | Building[]>('/buildings/', {
      params: {
        page_size: 1000, // Request a very large page size to get all buildings
        page: 1
      }
    });
    const data = resp.data;
    console.log('[API CALL] Raw API response:', data);
    console.log('[API CALL] Response type:', typeof data);
    console.log('[API CALL] Is array:', Array.isArray(data));
    
    const buildings = Array.isArray(data) ? data : data.results ?? [];
    console.log('[API CALL] Processed buildings:', buildings);
    console.log('[API CALL] Buildings count:', buildings.length);
    
    // If we still get paginated results, try to get all pages
    if (data.next && buildings.length < 1000) {
      console.log('[API CALL] Pagination detected, fetching all pages...');
      let allBuildings = [...buildings];
      let nextUrl = data.next;
      let totalCount = data.count || 0;
      
      while (nextUrl && allBuildings.length < totalCount && allBuildings.length < 1000) {
        console.log('[API CALL] Fetching next page:', nextUrl);
        const nextResp = await api.get(nextUrl);
        const nextData = nextResp.data;
        const nextBuildings = Array.isArray(nextData) ? nextData : nextData.results ?? [];
        allBuildings = [...allBuildings, ...nextBuildings];
        nextUrl = nextData.next;
        console.log('[API CALL] Total buildings so far:', allBuildings.length);
        
        // Safety check: if we've reached the total count, stop
        if (allBuildings.length >= totalCount) {
          console.log('[API CALL] Reached total count, stopping pagination');
          break;
        }
      }
      
      console.log('[API CALL] Final total buildings:', allBuildings.length);
      return allBuildings;
    }
    
    return buildings;
  } catch (error) {
    console.error('[API CALL] Error fetching all buildings:', error);
    throw error;
  }
}

// Public version for kiosk mode (no authentication required)
export async function fetchAllBuildingsPublic(): Promise<Building[]> {
  console.log('[API CALL] Fetching all buildings (public, no pagination)');
  try {
    // Use apiPublic for public access to the public endpoint
    const resp = await apiPublic.get<Building[]>('/buildings/public/');
    const buildings = resp.data;
    console.log('[API CALL] Raw API response (public):', buildings);
    console.log('[API CALL] Buildings count (public):', buildings.length);
    
    return buildings;
  } catch (error) {
    console.error('[API CALL] Error fetching all buildings (public):', error);
    throw error;
  }
}

export async function fetchBuilding(id: number): Promise<Building> {
  console.log(`[API CALL] Attempting to fetch /buildings/${id}/`);
  const { data } = await api.get<Building>(`/buildings/${id}/`);
  return data;
}

// Type alias for building creation/update payload
export type BuildingPayload = Partial<Omit<Building, 'id' | 'created_at' | 'updated_at' | 'latitude' | 'longitude'>> & {
  latitude?: number | string;
  longitude?: number | string;
  street_view_image?: string;
};

export async function createBuilding(payload: BuildingPayload): Promise<Building> {
  console.log('[API CALL] Attempting to create building:', payload);
  console.log('[API CALL] Payload type:', typeof payload);
  console.log('[API CALL] Payload JSON:', JSON.stringify(payload, null, 2));
  console.log('[API CALL] Latitude in payload:', payload.latitude, 'type:', typeof payload.latitude);
  console.log('[API CALL] Longitude in payload:', payload.longitude, 'type:', typeof payload.longitude);
  
  try {
    // Log the exact request configuration
    const config = {
      url: '/buildings/',
      method: 'POST',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access')}`
      }
    };
    console.log('[API CALL] Request config:', config);
    console.log('[API CALL] Request data stringified:', JSON.stringify(payload));
    
    const { data } = await api.post<Building>('/buildings/', payload);
    console.log('[API CALL] Created building successfully:', data);
    return data;
  } catch (error) {
    console.error('[API CALL] Error creating building:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('[API CALL] Error response data:', (error as any).response?.data);
      console.error('[API CALL] Error response status:', (error as any).response?.status);
    }
    throw error;
  }
}

export async function updateBuilding(id: number, payload: BuildingPayload): Promise<Building> {
  console.log(`[API CALL] Attempting to update building ${id}:`, payload);
  const { data } = await api.put<Building>(`/buildings/${id}/`, payload);
  return data;
}

export async function deleteBuilding(id: number): Promise<void> {
  console.log(`[API CALL] Attempting to delete building ${id}`);
  try {
    await api.delete(`/buildings/${id}/`);
    console.log(`[API CALL] Successfully deleted building ${id}`);
  } catch (error) {
    console.error(`[API CALL] Error deleting building ${id}:`, error);
    throw error;
  }
}

export async function fetchAnnouncements(buildingId?: number | null): Promise<Announcement[]> {
  // When buildingId is null, fetch from all buildings (no filter)
  const relativeUrl = buildingId ? `/announcements/?building=${buildingId}` : '/announcements/';
  
  // --- ΠΡΟΣΘΕΣΕ ΑΥΤΑ ΤΑ DEBUG LOGS ---
  console.log(`%c[DEBUG fetchAnnouncements] Called for announcements page with buildingId: ${buildingId}`, "color: blue; font-weight: bold;");
  console.log(`%c[DEBUG fetchAnnouncements] Constructed relativeUrl: "${relativeUrl}"`, "color: blue;");
  console.log(`%c[DEBUG fetchAnnouncements] Axios instance current baseURL from defaults: "${api.defaults.baseURL}"`, "color: blue;");
  // Αν το API_BASE_URL είναι exported από το ίδιο αρχείο και προσβάσιμο εδώ:
  // console.log(`%c[DEBUG fetchAnnouncements] API_BASE_URL const from import: "${API_BASE_URL}"`, "color: blue;");
  // --- ΤΕΛΟΣ DEBUG LOGS ---

  console.log(`[API CALL] Attempting to fetch ${relativeUrl}`); // Το δικό σου υπάρχον log
  
  try {
    const resp: AxiosResponse<{ results?: any[] } | any[]> = await api.get(relativeUrl);
    const data = resp.data;
    const rows: any[] = Array.isArray(data) ? data : data.results ?? [];
    return rows.map((row): Announcement => ({
      id: row.id,
      title: row.title,
      description: row.description ?? row.content ?? '',
      file: row.file ?? null,
      start_date: row.start_date ?? null,
      end_date: row.end_date ?? null,
      is_active: row.is_active,
      is_currently_active: row.is_currently_active,
      days_remaining: row.days_remaining ?? null,
      status_display: row.status_display ?? '',
      building: row.building,
      building_name: row.building_name ?? '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error(`[DEBUG fetchAnnouncements] Error during api.get("${relativeUrl}"):`, error);
    // Για να δεις το config του request που απέτυχε:
    // @ts-ignore
    if (error?.isAxiosError && error?.config) {
        // @ts-ignore
        console.error('[DEBUG fetchAnnouncements] Failed Request Config:', JSON.stringify({url: error.config.url, baseURL: error.config.baseURL, method: error.config.method, params: error.config.params }, null, 2));
    }
    throw error;
  }
}

export async function fetchAnnouncement(id: string | number): Promise<Announcement> {
  console.log(`[API CALL] Attempting to fetch announcement with ID: ${id}`);
  
  try {
    const { data } = await api.get(`/announcements/${id}/`);
    return {
      id: data.id,
      title: data.title,
      description: data.description ?? data.content ?? '',
      file: data.file ?? null,
      start_date: data.start_date,
      end_date: data.end_date,
      is_active: data.is_active,
      is_currently_active: data.is_currently_active,
      days_remaining: data.days_remaining ?? null,
      status_display: data.status_display ?? '',
      building: data.building,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error(`[API CALL] Error fetching announcement ${id}:`, error);
    throw error;
  }
}

export async function deleteAnnouncement(announcementId: number): Promise<string> {
  try {
    const { data } = await api.delete<{ message: string }>(`/announcements/${announcementId}/`);
    console.log(`[API] Successfully deleted announcement ${announcementId}`);
    return data.message || 'Η ανακοίνωση διαγράφηκε επιτυχώς';
  } catch (error) {
    console.error(`[API] Error deleting announcement ${announcementId}:`, error);
    throw error;
  }
}

export interface CreateAnnouncementPayload { 
  title: string; description: string; start_date: string; end_date: string; 
  file?: File | null; building: number; is_active?: boolean; 
}
export async function createAnnouncement(payload: CreateAnnouncementPayload): Promise<Announcement> {
  console.log('[API CALL] Attempting to create announcement:', payload.file ? 'with file' : 'without file');
  
  // Handle building=0 as null for global announcements
  const buildingValue = payload.building === 0 ? null : payload.building;
  
  if (payload.file && payload.file instanceof File) {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('start_date', payload.start_date);
    formData.append('end_date', payload.end_date);
    if (buildingValue !== null) {
      formData.append('building', String(buildingValue));
    }
    if (payload.is_active !== undefined) formData.append('is_active', String(payload.is_active));
    formData.append('file', payload.file, payload.file.name);
    const { data } = await api.post<Announcement>('/announcements/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } else {
    const jsonData: any = { ...payload };
    if (payload.file === null || payload.file === undefined) delete jsonData.file;
    // Set building to null for global announcements
    jsonData.building = buildingValue;
    const { data } = await api.post<Announcement>('/announcements/', jsonData);
    return data;
  }
}

export async function fetchVotes(buildingId?: number | null): Promise<Vote[]> {
  const url = buildingId ? `/votes/?building=${buildingId}` : '/votes/';
  console.log(`[API CALL] Attempting to fetch ${url}`);
  const resp: AxiosResponse<{ results?: Vote[] } | Vote[]> = await api.get(url);
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchMyVote(voteId: number): Promise<VoteSubmission | null> {
  console.log(`[API CALL] Attempting to fetch my submission for vote ${voteId}`);
  try {
    const { data } = await api.get<VoteSubmission>(`/votes/${voteId}/my-submission/`);
    return data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.log(`[API CALL] No submission found for vote ${voteId}`);
      return null;
    }
    console.error(`[API CALL] Error fetching submission for vote ${voteId}:`, error);
    throw error;
  }
}

export async function submitVote(voteId: number, choice: string): Promise<VoteSubmission> {
  console.log(`[API CALL] Attempting to submit vote ${voteId} with choice: ${choice}`);
  const { data } = await api.post<VoteSubmission>(`/votes/${voteId}/vote/`, { choice });
  return data;
}

export async function fetchVoteResults(voteId: number): Promise<VoteResultsData> {
  console.log(`[API CALL] Attempting to fetch results for vote ${voteId}`);
  const { data } = await api.get<VoteResultsData>(`/votes/${voteId}/results/`);
  return data;
}

export async function deleteVote(voteId: number): Promise<string> {
  try {
    const { data } = await api.delete<{ message: string }>(`/votes/${voteId}/`);
    console.log(`[API] Successfully deleted vote ${voteId}`);
    return data.message || 'Η ψηφοφορία διαγράφηκε επιτυχώς';
  } catch (error) {
    console.error(`[API] Error deleting vote ${voteId}:`, error);
    throw error;
  }
}

export interface CreateVotePayload { 
  title: string; description: string; start_date: string; 
  end_date?: string; choices: string[]; building: number; 
  is_active?: boolean;
}
export async function createVote(payload: CreateVotePayload): Promise<Vote> {
  console.log('[API CALL] Attempting to create vote:', payload);
  
  // Handle building=0 as null for global votes
  const buildingValue = payload.building === 0 ? null : payload.building;
  
  const { data } = await api.post<Vote>('/votes/', { 
    ...payload, 
    building: buildingValue,
    is_active: payload.is_active ?? true 
  });
  return data;
}

export interface PublicInfoData {
  announcements: Announcement[];
  votes: Vote[];
  building_info?: {
    id: number;
    name: string;
    address: string;
    city?: string;
    postal_code?: string;
    apartments_count?: number;
    internal_manager_name?: string;
    internal_manager_phone?: string;
    management_office_name?: string;
    management_office_phone?: string;
    management_office_address?: string;
  };
  advertising_banners?: Array<{
    id: number;
    title: string;
    description: string;
    image_url: string;
    link: string;
    duration: number;
  }>;
  general_info?: {
    current_time: string;
    current_date: string;
    system_status: string;
    last_updated: string;
  };
}

export async function fetchPublicInfo(buildingId: number): Promise<PublicInfoData> {
  const { data } = await apiPublic.get(`/public-info/${buildingId}/`);
  return data;
}
export async function fetchRequests(filters: { status?: string; buildingId?: number | null } = {}): Promise<UserRequest[]> {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  
  // Handle building parameter: only add it if buildingId is provided
  // If buildingId is null, we want to show all buildings, so we pass 'null'
  // If buildingId is undefined, we don't add the parameter at all
  if (filters.buildingId !== undefined) {
    if (filters.buildingId === null) {
      params.append('building', 'null');
    } else {
      params.append('building', String(filters.buildingId));
    }
  }
  const queryString = params.toString();
  const url = `/user-requests/${queryString ? '?' + queryString : ''}`;
  
  console.log(`[API CALL] Attempting to fetch ${url}`);
  const resp: AxiosResponse<{ results?: any[] } | any[]> = await api.get(url);
  const data = resp.data;
  const rows: any[] = Array.isArray(data) ? data : data.results ?? [];
  return rows.map((r): UserRequest => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    created_by: r.created_by,
    created_by_username: r.created_by_username,
    building: r.building,
    supporter_count: r.supporter_count ?? 0,
    supporter_usernames: r.supporter_usernames ?? [],
    building_name: r.building_name ?? '',
    is_urgent: r.is_urgent ?? false,
    type: r.type ?? '',
    supporters: r.supporters ?? [],
    priority: r.priority ?? 'medium',
    maintenance_category: r.type ?? 'other',
    photos: r.photos ?? [],
    assigned_to: r.assigned_to,
    assigned_to_username: r.assigned_to_username,
    estimated_completion: r.estimated_completion,
    completed_at: r.completed_at,
    notes: r.notes,
    photos: r.photos,
    location: r.location,
    apartment_number: r.apartment_number,
    cost_estimate: r.cost_estimate,
    actual_cost: r.actual_cost,
    contractor_notes: r.contractor_notes,
  }));
}

export async function fetchTopRequests(buildingId: number | null): Promise<UserRequest[]> {
  const url = buildingId ? `/user-requests/top/?building=${buildingId}` : '/user-requests/top/?building=null';
  const resp: AxiosResponse<{ results?: any[] } | any[]> = await api.get(url);
  const data = resp.data;
  const rows: any[] = Array.isArray(data) ? data : data.results ?? [];

  return rows.map((r): UserRequest => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    created_by: r.created_by,
    created_by_username: r.created_by_username,
    building: r.building,
    supporter_count: r.supporter_count ?? 0,
    supporter_usernames: Array.isArray(r.supporter_usernames) ? r.supporter_usernames : [], // ✅ εξασφαλίζει string[]
    building_name: r.building_name ?? '',
    is_urgent: r.is_urgent ?? false,
    type: r.type ?? '',
    is_supported: r.is_supported ?? false,
    priority: r.priority ?? 'medium',
    maintenance_category: r.type ?? 'other',
    photos: r.photos ?? [],
    assigned_to: r.assigned_to,
    assigned_to_username: r.assigned_to_username,
    estimated_completion: r.estimated_completion,
    completed_at: r.completed_at,
    notes: r.notes,
    photos: r.photos,
    location: r.location,
    apartment_number: r.apartment_number,
    cost_estimate: r.cost_estimate,
    actual_cost: r.actual_cost,
    contractor_notes: r.contractor_notes,
  }));
}

export async function fetchUserRequestsForBuilding(buildingId: number): Promise<UserRequest[]> {
  const url = `/user-requests/?building=${buildingId}`;
  const resp: AxiosResponse<{ results?: any[] } | any[]> = await api.get(url);
  const data = resp.data;
  const rows: any[] = Array.isArray(data) ? data : data.results ?? [];

  return rows.map((r): UserRequest => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    created_by: r.created_by,
    created_by_username: r.created_by_username,
    building: r.building,
    supporter_count: r.supporter_count ?? 0,
    supporter_usernames: Array.isArray(r.supporter_usernames) ? r.supporter_usernames : [],
    building_name: r.building_name ?? '',
    is_urgent: r.is_urgent ?? false,
    type: r.type ?? '',
    is_supported: r.is_supported ?? false,
    priority: r.priority ?? 'medium',
    maintenance_category: r.type ?? 'other',
    photos: r.photos ?? [],
    assigned_to: r.assigned_to,
    assigned_to_username: r.assigned_to_username,
    estimated_completion: r.estimated_completion,
    completed_at: r.completed_at,
    notes: r.notes,
    photos: r.photos,
    location: r.location,
    apartment_number: r.apartment_number,
    cost_estimate: r.cost_estimate,
    actual_cost: r.actual_cost,
    contractor_notes: r.contractor_notes,
  }));
}


// ✅ Υλοποίηση toggleSupportRequest στο αρχείο frontend/lib/api.ts
  export async function toggleSupportRequest(
    id: number
  ): Promise<{ status: string; supporter_count: number; supported: boolean }> {
    console.log(`[API CALL] Attempting to toggle support for request ${id}`);
    const { data } = await api.post(`/user-requests/${id}/support/`);
    return data;
  }


export interface CreateUserRequestPayload {
  title: string; description: string; building: number;
  type?: string; is_urgent?: boolean;
  priority?: string;
  location?: string;
  apartment_number?: string;
  photos?: File[];
}
export async function createUserRequest(payload: CreateUserRequestPayload): Promise<UserRequest> {
  console.log('[API CALL] Attempting to create user request:', payload);
  console.log('[API CALL] Photos count:', payload.photos?.length || 0);
  
  // Handle file uploads
  const formData = new FormData();
  
  // Add text fields
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('building', payload.building.toString());
  
  if (payload.type) formData.append('type', payload.type);
  if (payload.is_urgent) formData.append('is_urgent', payload.is_urgent.toString());
  if (payload.priority) formData.append('priority', payload.priority);
  if (payload.location) formData.append('location', payload.location);
  if (payload.apartment_number) formData.append('apartment_number', payload.apartment_number);
  
  // Add photos
  if (payload.photos && payload.photos.length > 0) {
    console.log('[API CALL] Adding photos to FormData:');
    payload.photos.forEach((photo, index) => {
      console.log(`[API CALL] Photo ${index + 1}:`, {
        name: photo.name,
        size: photo.size,
        type: photo.type
      });
      formData.append(`photos`, photo);
    });
  } else {
    console.log('[API CALL] No photos to add');
  }
  
  console.log('[API CALL] FormData entries:');
  for (let [key, value] of formData.entries()) {
    console.log(`[API CALL] ${key}:`, value);
  }
  
  const { data } = await api.post<UserRequest>('/user-requests/', formData, {
    headers: {
      // Remove Content-Type for FormData - let the browser set it with boundary
      'Content-Type': undefined,
    },
  });
  
  console.log('[API CALL] Response data:', data);
  return data;
}

export interface UpdateUserRequestPayload {
  title?: string; description?: string; building?: number;
  type?: string; is_urgent?: boolean; status?: string;
}
export async function updateUserRequest(id: number, payload: UpdateUserRequestPayload): Promise<UserRequest> {
  console.log(`[API CALL] Attempting to update user request ${id}:`, payload);
  const { data } = await api.patch<UserRequest>(`/user-requests/${id}/`, payload);
  return data;
}

export async function deleteUserRequest(requestId: number): Promise<void> {
  try {
    await api.delete(`/user-requests/${requestId}/`);
    console.log(`[API] Successfully deleted user request ${requestId}`);
  } catch (error) {
    console.error(`[API] Error deleting user request ${requestId}:`, error);
    throw error;
  }
}

export async function fetchObligationsSummary(): Promise<ObligationSummary> {
  console.log('[API CALL] Attempting to fetch /obligations/summary/');
  const { data } = await api.get<ObligationSummary>('/obligations/summary/');
  return data;
}

export async function fetchObligations(filters: { buildingId?: number, status?: string } = {}): Promise<Obligation[]> {
  const params = new URLSearchParams();
  if (filters.buildingId) params.append('building', String(filters.buildingId));
  if (filters.status) params.append('status', filters.status);
  const queryString = params.toString();
  const url = `/obligations/${queryString ? '?' + queryString : ''}`;
  console.log(`[API CALL] Attempting to fetch ${url}`);
  const resp: AxiosResponse<{ results?: Obligation[] } | Obligation[]> = await api.get(url);
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchObligation(id: number): Promise<Obligation> {
  console.log(`[API CALL] Attempting to fetch /obligations/${id}/`);
  const { data } = await api.get<Obligation>(`/obligations/${id}/`);
  return data;
}

export async function createObligation(payload: Omit<Obligation, 'id' | 'created_at' | 'updated_at'>): Promise<Obligation> {
  console.log('[API CALL] Attempting to create obligation:', payload);
  const { data } = await api.post<Obligation>('/obligations/', payload);
  return data;
}

export async function updateObligation(id: number, payload: Partial<Omit<Obligation, 'id' | 'created_at' | 'updated_at'>>): Promise<Obligation> {
  console.log(`[API CALL] Attempting to update obligation ${id}:`, payload);
  const { data } = await api.put<Obligation>(`/obligations/${id}/`, payload);
  return data;
}

export async function deleteObligation(id: number): Promise<void> {
  console.log(`[API CALL] Attempting to delete obligation ${id}`);
  await api.delete(`/obligations/${id}/`);
}

// Handles refreshing the access token and retrying the original request.
async function handleTokenRefresh(originalRequest: InternalAxiosRequestConfig & { _retry?: boolean }, error: AxiosError) {
  originalRequest._retry = true;
  isRefreshing = true;
  const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh') : null;

  if (!refresh) {
    handleLogout('[handleTokenRefresh] No refresh token found. Logging out.');
    isRefreshing = false;
    processQueue(error, null);
    return Promise.reject(error);
  }

  try {
    console.log('[handleTokenRefresh] Attempting to refresh token with:', API_BASE_URL);
    
    // Χρησιμοποιούμε απευθείας axios αντί για το api instance για να αποφύγουμε κυκλικές κλήσεις
    const { data } = await axios.post<{ access: string }>(`${API_BASE_URL}/users/token/refresh/`, { refresh }, {
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });

    if (!data.access) {
      console.error('[handleTokenRefresh] Token refresh response did not include access token!', data);
      throw new Error('Token refresh failed: No access token in response');
    }

    console.log('[handleTokenRefresh] Token refresh successful, new token received');
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('access', data.access);
      console.log('[handleTokenRefresh] New access token saved to localStorage');
    }

    // Αποθηκεύουμε το νέο token
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
    processQueue(null, data.access);

    // Ορίζουμε Authorization για το αρχικό αίτημα
    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers['Authorization'] = `Bearer ${data.access}`;

    // 🔍 DEBUG LOG ΠΡΙΝ το retry
    console.log('%c[INTERCEPTOR] Replaying original request with new token:', 'color: green; font-weight: bold;');
    console.log({
      url: originalRequest.url,
      method: originalRequest.method,
      headers: {
        ...(originalRequest.headers || {}),
        Authorization: originalRequest.headers['Authorization']?.slice(0, 10) + '...' // Μόνο τα πρώτα 10 chars
      }
    });

    // Επαναποστολή του αρχικού αιτήματος με το νέο token
    return api(originalRequest);

  } catch (refreshError: any) {
    console.error('[handleTokenRefresh] Token refresh failed:', refreshError);
    
    // Αν το refresh απέτυχε, πιθανότατα το refresh token είναι άκυρο ή έχει λήξει
    handleLogout('[handleTokenRefresh] Token refresh failed. Logging out.');
    processQueue(refreshError, null);
    
    // Ανακατεύθυνση στη σελίδα login
    if (typeof window !== 'undefined') {
      console.log('[handleTokenRefresh] Redirecting to login page...');
      window.location.href = '/login';
    }
    
    return Promise.reject(refreshError instanceof Error ? refreshError : new Error(String(refreshError)));
  } finally {
    isRefreshing = false;
  }
}

// Queues requests while token is being refreshed
function queueRequestWhileRefreshing(originalRequest: InternalAxiosRequestConfig & { _retry?: boolean }) {
  return new Promise((resolve, reject) => {
    failedQueue.push({
      resolve: (token: string) => {
        if (token) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
        }
        resolve(api(originalRequest));
      },
      reject: (err: any) => {
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    });
  });
}

// Logs out the user by clearing tokens and user data from localStorage.
function handleLogout(logMessage: string) {
  console.warn(logMessage);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    
    // Ανακατεύθυνση στη σελίδα login αν δεν είμαστε ήδη εκεί
    if (!window.location.pathname.includes('/login')) {
      console.log('[handleLogout] Redirecting to login page...');
      window.location.href = '/login';
    }
  }
}

// Νέα συνάρτηση για την ανάκτηση των κατοίκων ενός κτιρίου
export async function fetchResidents(buildingId: number | null) {
  const url = buildingId ? `/residents/?building=${buildingId}` : '/residents/';
  console.log('[fetchResidents] Making request to:', url);
  const response = await api.get(url);
  console.log('[fetchResidents] Response:', response.data);
  // Επιστρέφουμε το results array από την paginated response
  return response.data.results || response.data;
}

// Τύποι για τους κατοίκους
export type Resident = {
  id: number;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  building_name: string;
  apartment: string;
  building: number;
  role: 'manager' | 'owner' | 'tenant';
  phone: string;
  created_at: string;
};

export interface CreateResidentPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  apartment: string;
  building_id: number;
  role?: 'manager' | 'owner' | 'tenant';
  phone?: string;
}

export async function createResident(payload: CreateResidentPayload): Promise<Resident> {
  console.log('[createResident] Sending payload:', payload);
  const response = await api.post('/residents/create-with-user/', payload);
  console.log('[createResident] Response:', response.data);
  return response.data.resident;
}

export async function deleteResident(id: number): Promise<void> {
  await api.delete(`/residents/${id}/remove/`);
}

// ==================== APARTMENTS API ====================

export type Apartment = {
  id: number;
  building: number;
  building_name: string;
  number: string;
  floor?: number;
  owner_name: string;
  owner_phone: string;
  owner_phone2: string;
  owner_email: string;
  owner_user?: number;
  owner_user_email?: string;
  ownership_percentage?: number;
  tenant_name: string;
  tenant_phone: string;
  tenant_phone2: string;
  tenant_email: string;
  tenant_user?: number;
  tenant_user_email?: string;
  is_rented: boolean;
  rent_start_date?: string;
  rent_end_date?: string;
  square_meters?: number;
  bedrooms?: number;
  notes: string;
  occupant_name: string;
  occupant_phone: string;
  occupant_phone2: string;
  occupant_email: string;
  status_display: string;
  created_at: string;
  updated_at: string;
};

export type ApartmentList = {
  id: number;
  building: number;
  building_name: string;
  number: string;
  identifier: string;
  floor?: number;
  owner_name: string;
  owner_phone: string;
  owner_phone2: string;
  owner_email: string;
  ownership_percentage?: number;
  tenant_name: string;
  tenant_phone: string;
  tenant_phone2: string;
  tenant_email: string;
  occupant_name: string;
  occupant_phone: string;
  occupant_phone2: string;
  occupant_email: string;
  status_display: string;
  is_rented: boolean;
};

export interface CreateApartmentPayload {
  building: number;
  number: string;
  identifier: string;
  floor?: number;
  owner_name?: string;
  owner_phone?: string;
  owner_phone2?: string;
  owner_email?: string;
  ownership_percentage?: number;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_phone2?: string;
  tenant_email?: string;
  is_rented?: boolean;
  rent_start_date?: string;
  rent_end_date?: string;
  square_meters?: number;
  bedrooms?: number;
  notes?: string;
}

export interface BulkCreateApartmentsPayload {
  building: number;
  start_number: number;
  end_number: number;
  floor_mapping?: Record<string, number>;
}

export interface UpdateOwnerPayload {
  identifier?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_phone2?: string;
  owner_email?: string;
  ownership_percentage?: number;
}

export interface UpdateTenantPayload {
  tenant_name?: string;
  tenant_phone?: string;
  tenant_phone2?: string;
  tenant_email?: string;
  is_rented?: boolean;
  is_closed?: boolean;
  rent_start_date?: string;
  rent_end_date?: string;
}

export interface ApartmentStatistics {
  total: number;
  rented: number;
  owned: number;
  empty: number;
  occupancy_rate: number;
}

export interface BuildingApartmentsResponse {
  building: {
    id: number;
    name: string;
    address: string;
    apartments_count: number;
  };
  apartments: ApartmentList[];
}

// Λήψη διαμερισμάτων
export async function fetchApartments(buildingId?: number, status?: string, ordering?: string): Promise<ApartmentList[]> {
  console.log('[API CALL] Attempting to fetch apartments', { buildingId, status, ordering });
  
  const params = new URLSearchParams();
  if (buildingId) params.append('building', buildingId.toString());
  if (status) params.append('status', status);
  if (ordering) params.append('ordering', ordering);
  
  const { data } = await api.get<ApartmentList[]>(`/apartments/?${params.toString()}`);
  return data;
}

// Λήψη συγκεκριμένου διαμερίσματος
export async function fetchApartment(id: number): Promise<Apartment> {
  console.log('[API CALL] Attempting to fetch apartment:', id);
  const { data } = await api.get<Apartment>(`/apartments/${id}/`);
  return data;
}

// Λήψη όλων των διαμερισμάτων ενός κτιρίου
export async function fetchBuildingApartments(buildingId: number): Promise<BuildingApartmentsResponse> {
  console.log('[API CALL] Attempting to fetch building apartments:', buildingId);
  const { data } = await api.get<BuildingApartmentsResponse>(`/apartments/by-building/${buildingId}/`);
  return data;
}

// Δημιουργία διαμερίσματος
export async function createApartment(payload: CreateApartmentPayload): Promise<Apartment> {
  console.log('[API CALL] Attempting to create apartment:', payload);
  const { data } = await api.post<Apartment>('/apartments/', payload);
  return data;
}

// Λήψη λίστας ενοικιαστών για QR code connection
export async function fetchResidentsForQR(buildingId: number): Promise<{
  building: { id: number; name: string; address: string };
  residents: Array<{
    id: string;
    apartment_id: number;
    apartment_number: string;
    name: string;
    phone: string;
    email: string;
    type: 'owner' | 'tenant';
    is_rented: boolean;
    has_email: boolean;
  }>;
  total_residents: number;
}> {
  console.log('[API CALL] Attempting to fetch residents for QR code:', buildingId);
  const { data } = await api.get(`/apartments/residents/${buildingId}/`);
  return data;
}

// Ενημέρωση email ενοικιαστή/ιδιοκτήτη
export async function updateResidentEmail(
  apartmentId: number, 
  type: 'owner' | 'tenant', 
  email: string
): Promise<{ message: string; apartment_id: number; email: string }> {
  console.log('[API CALL] Attempting to update resident email:', { apartmentId, type, email });
  const { data } = await api.post(`/apartments/${apartmentId}/update-email/`, {
    type,
    email
  });
  return data;
}

// Μαζική δημιουργία διαμερισμάτων
export async function bulkCreateApartments(payload: BulkCreateApartmentsPayload): Promise<{ message: string; created_count: number; apartments: ApartmentList[] }> {
  console.log('[API CALL] Attempting to bulk create apartments:', payload);
  const { data } = await api.post('/apartments/bulk-create/', payload);
  return data;
}

// Ενημέρωση διαμερίσματος
export async function updateApartment(id: number, payload: Partial<CreateApartmentPayload>): Promise<Apartment> {
  console.log('[API CALL] Attempting to update apartment:', id, payload);
  const { data } = await api.patch<Apartment>(`/apartments/${id}/`, payload);
  return data;
}

// Ενημέρωση στοιχείων ιδιοκτήτη
export async function updateApartmentOwner(id: number, payload: UpdateOwnerPayload): Promise<{ message: string; apartment: Apartment }> {
  console.log('[API CALL] Attempting to update apartment owner:', id, payload);
  const { data } = await api.post(`/apartments/${id}/update-owner/`, payload);
  return data;
}

// Ενημέρωση στοιχείων ενοίκου
export async function updateApartmentTenant(id: number, payload: UpdateTenantPayload): Promise<{ message: string; apartment: Apartment }> {
  console.log('[API CALL] Attempting to update apartment tenant:', id, payload);
  const { data } = await api.post(`/apartments/${id}/update-tenant/`, payload);
  return data;
}

// Διαγραφή διαμερίσματος
export async function deleteApartment(id: number): Promise<{ message: string }> {
  console.log('[API CALL] Attempting to delete apartment:', id);
  const { data } = await api.delete(`/apartments/${id}/`);
  return data;
}

// Στατιστικά διαμερισμάτων
export async function fetchApartmentStatistics(buildingId?: number): Promise<ApartmentStatistics> {
  console.log('[API CALL] Attempting to fetch apartment statistics:', buildingId);
  
  const params = buildingId ? `?building=${buildingId}` : '';
  const { data } = await api.get<ApartmentStatistics>(`/apartments/statistics/${params}`);
  return data;
}

if (typeof window !== "undefined") {
  // Next.js App Router: soft reload
  import("next/navigation").then(({ useRouter }) => {
    // ΠΡΟΣΟΧΗ: useRouter είναι hook, δεν μπορεί να κληθεί εκτός component.
    // Εναλλακτικά, κάνε:
    // window.location.reload(); // fallback αν δεν έχεις πρόσβαση σε router instance
  });
}

// ============================================================================
// 🏦 FINANCIAL API FUNCTIONS - REMOVED FOR CLEAN REBUILD
// ============================================================================

// Payment API functions
// ============================================================================
// 🏦 FINANCIAL API FUNCTIONS - REMOVED FOR CLEAN REBUILD
// ============================================================================
