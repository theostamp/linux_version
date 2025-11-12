/**
 * Client-side API Helper
 *
 * Όλα τα αιτήματα (GET/POST/…) πρέπει να περνούν από το /api/* namespace.
 * Το Next.js rewrite τα προωθεί στο server-side proxy (`/backend-proxy`)
 * οπότε δεν κάνουμε ποτέ απευθείας κλήσεις στο Railway από τον browser.
 */

type ApiErrorResponse = {
  status: number;
  body?: string;
};

type ApiError = Error & {
  status?: number;
  response?: ApiErrorResponse;
};

const MAX_ERROR_BODY_CHARS = 300;

// Global API call throttling & caching
const API_CALL_CACHE = new Map<string, { data: unknown, timestamp: number, promise?: Promise<unknown> }>();
const MIN_REQUEST_INTERVAL = 1000; // 1 second minimum between identical requests

// 429 error handling with exponential backoff
const RETRY_DELAYS = new Map<string, number>(); // Track retry delays per endpoint
const MAX_RETRY_DELAY = 60000; // Maximum 1 minute delay

function getRetryDelay(endpoint: string): number {
  const currentDelay = RETRY_DELAYS.get(endpoint) || 1000;
  const nextDelay = Math.min(currentDelay * 2, MAX_RETRY_DELAY);
  RETRY_DELAYS.set(endpoint, nextDelay);
  return currentDelay;
}

function resetRetryDelay(endpoint: string): void {
  RETRY_DELAYS.delete(endpoint);
}

function getCacheKey(url: string, options: Record<string, unknown> = {}): string {
  return `${url}_${JSON.stringify(options)}`;
}

function shouldThrottleRequest(cacheKey: string): boolean {
  const cached = API_CALL_CACHE.get(cacheKey);
  if (!cached) return false;
  
  const timeSinceLastCall = Date.now() - cached.timestamp;
  return timeSinceLastCall < MIN_REQUEST_INTERVAL;
}

function getCachedOrInFlight<T>(cacheKey: string): Promise<T> | null {
  const cached = API_CALL_CACHE.get(cacheKey);
  if (!cached) return null;
  
  // If there's an in-flight request, return that promise
  if (cached.promise) return cached.promise as Promise<T>;
  
  // If data is less than 5 minutes old, return cached data
  const age = Date.now() - cached.timestamp;
  if (age < 5 * 60 * 1000) { // 5 minutes cache
    console.log(`[API THROTTLE] Returning cached data for ${cacheKey}`);
    return Promise.resolve(cached.data as T);
  }
  
  return null;
}

const trimErrorBody = (body?: string) => {
  if (!body) return undefined;
  return body.length > MAX_ERROR_BODY_CHARS
    ? `${body.slice(0, MAX_ERROR_BODY_CHARS)}…`
    : body;
};

const createApiError = (
  method: string,
  url: string,
  status: number,
  body?: string,
): ApiError => {
  const trimmedBody = trimErrorBody(body);
  const suffix = trimmedBody ? ` ${trimmedBody}` : "";
  const error = new Error(
    `${method.toUpperCase()} ${url} failed: ${status}${suffix}`,
  ) as ApiError;
  error.status = status;
  error.response = { status, body: trimmedBody };
  return error;
};

const normalizeApiPath = (path: string): string => {
  if (!path) return "/api/";
  const prefixed = path.startsWith("/") ? path : `/${path}`;
  if (prefixed.startsWith("/api")) {
    return prefixed.startsWith("/api/") ? prefixed : `${prefixed}/`;
  }
  return `/api${prefixed}`;
};

/**
 * Get the API base URL for server-side requests
 */
export function getApiBase(): string {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000"
  );
}

// Export API_BASE_URL for components that need it
export const API_BASE_URL = typeof window !== 'undefined' 
  ? '/api' 
  : getApiBase();

/**
 * Build full API url (absolute in SSR, absolute same-origin on client)
 */
export function getApiUrl(path: string): string {
  const normalized = normalizeApiPath(path);
  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }
  const base = getApiBase();
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${trimmedBase}${normalized}`;
}

/**
 * Get CSRF token from cookies
 */
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

/**
 * Get headers for API requests
 */
function getHeaders(method: string = 'GET'): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (typeof window !== "undefined") {
    // Add auth token if available
    const token =
      localStorage.getItem("access_token") || 
      localStorage.getItem("access") || 
      localStorage.getItem("accessToken");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Add CSRF token for mutation requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
    }
  }
  
  return headers;
}

/**
 * GET request helper with throttling & caching
 */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const apiUrl = getApiUrl(path);
  const url = new URL(apiUrl);
  
  // Preserve trailing slash - URL constructor removes it from pathname
  const hadTrailingSlash = apiUrl.endsWith('/') && !apiUrl.includes('?');
  if (hadTrailingSlash && !url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    });
  }
  
  const urlString = url.toString();
  const cacheKey = getCacheKey(urlString, params);
  
  // Check cache first
  const cached = getCachedOrInFlight<T>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Check if we should throttle this request
  if (shouldThrottleRequest(cacheKey)) {
    console.log('[API THROTTLE] Request throttled, returning cached data');
    const cachedData = API_CALL_CACHE.get(cacheKey);
    if (cachedData && cachedData.data) return cachedData.data as T;
  }
  
  // Create fetch promise
  const fetchPromise = (async () => {
    try {
      const res = await fetch(urlString, {
        method: "GET",
        headers: getHeaders('GET'),
        credentials: "include",
      });
      
      if (!res.ok) {
        // Reset retry delay on error
        resetRetryDelay(urlString);
        throw createApiError("GET", urlString, res.status);
      }
      
      const data = await res.json() as T;
      
      // Cache the result
      API_CALL_CACHE.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      
      // Reset retry delay on success
      resetRetryDelay(urlString);
      
      return data;
    } catch (error) {
      // Remove promise from cache on error
      const cached = API_CALL_CACHE.get(cacheKey);
      if (cached?.promise) {
        API_CALL_CACHE.delete(cacheKey);
      }
      throw error;
    }
  })();
  
  // Store promise in cache for in-flight requests
  API_CALL_CACHE.set(cacheKey, {
    data: null,
    timestamp: Date.now(),
    promise: fetchPromise,
  });
  
  return fetchPromise;
}

/**
 * POST request helper with retry logic
 */
export async function apiPost<T>(path: string, body: unknown, maxRetries: number = 3): Promise<T> {
  const url = getApiUrl(path);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getHeaders('POST'),
        body: JSON.stringify(body),
        credentials: "include",
      });
      
      if (!res.ok) {
        // Handle rate limiting (429) with exponential backoff
        if (res.status === 429 && attempt < maxRetries) {
          const delay = getRetryDelay(url);
          console.log(`[API RETRY] Rate limited (429), waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        const text = await res.text();
        throw createApiError("POST", url, res.status, text);
      }
      
      // Reset retry delay on success
      resetRetryDelay(url);
      
      return res.json();
    } catch (error) {
      lastError = error as Error;
      
      // Retry on network errors
      if (attempt < maxRetries && error instanceof TypeError) {
        const delay = await exponentialBackoff(attempt, maxRetries);
        console.log(`[API RETRY] Network error, waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('Max retry attempts exceeded');
}

/**
 * Exponential backoff utility for retries
 */
async function exponentialBackoff(attempt: number, maxAttempts: number = 3): Promise<number> {
  if (attempt > maxAttempts) {
    throw new Error('Max retry attempts exceeded');
  }
  const baseDelay = 1000; // 1 second
  const backoffDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * backoffDelay; // Add 10% jitter
  return backoffDelay + jitter;
}

/**
 * PUT request helper
 */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const url = getApiUrl(path);
  
  const res = await fetch(url, {
    method: "PUT",
    headers: getHeaders('PUT'),
    body: JSON.stringify(body),
    credentials: "include",
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw createApiError("PUT", url, res.status, text);
  }
  
  return res.json();
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const url = getApiUrl(path);
  
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders('PATCH'),
    body: JSON.stringify(body),
    credentials: "include",
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw createApiError("PATCH", url, res.status, text);
  }
  
  return res.json();
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(path: string): Promise<T> {
  const url = getApiUrl(path);
  
  const res = await fetch(url, {
    method: "DELETE",
    headers: getHeaders('DELETE'),
    credentials: "include",
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw createApiError("DELETE", url, res.status, text);
  }
  
  // DELETE might not return a body
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  
  return {} as T;
}

// ============================================================================
// Type definitions
// ============================================================================

export type Paginated<T> = { count?: number; next?: string|null; previous?: string|null; results?: T[] } | T[];

export function extractResults<T>(data: Paginated<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

export function extractCount<T>(data: Paginated<T>): number {
  if (Array.isArray(data)) return data.length;
  return typeof data.count === 'number' ? data.count : (data.results?.length ?? 0);
}

export function getActiveBuildingId(): number {
  if (typeof window === 'undefined') return 1;
  const fromStorage = window.localStorage.getItem('activeBuildingId');
  const parsed = fromStorage ? parseInt(fromStorage, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 1;
}

// ============================================================================
// Basic API Functions
// ============================================================================

import type { User } from '@/types/user';

// Request deduplication for getCurrentUser
let getCurrentUserPromise: Promise<User> | null = null;

export async function getCurrentUser(): Promise<User> {
  // If there's already a request in flight, return that promise
  if (getCurrentUserPromise) {
    console.log('[API CALL] getCurrentUser already in progress, returning existing promise');
    return getCurrentUserPromise;
  }

  console.log('[API CALL] Attempting to fetch /api/users/me/');
  
  getCurrentUserPromise = (async () => {
    try {
      const data = await apiGet<User>('/users/me/');
      if (typeof window !== 'undefined' && data) {
        localStorage.setItem('user', JSON.stringify(data));
      }
      return data;
    } finally {
      // Clear the promise when done (success or failure)
      getCurrentUserPromise = null;
    }
  })();

  return getCurrentUserPromise;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ access: string; refresh: string; user: User }> {
  console.log(`[API CALL] Attempting login for user: ${email}`);
  const data = await apiPost<{ access: string; refresh: string }>('/users/token/simple/', { email, password });

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    // Also store as 'access' and 'refresh' for backward compatibility
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    console.log('[loginUser] Tokens saved to localStorage');
  }

  // Get user data using the access token
  const userData = await getCurrentUser();
  
  return {
    access: data.access,
    refresh: data.refresh,
    user: userData
  };
}

export async function logoutUser(): Promise<void> {
  console.log('[API CALL] Attempting logout.');
  const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') || localStorage.getItem('refresh') : null;
  
  if (refresh) {
    try {
      await apiPost('/users/logout/', { refresh });
      console.log('[logoutUser] Logout request sent to backend.');
    } catch (error) {
      console.error("[logoutUser] Logout API call failed:", error);
    }
  } else {
    console.warn('[logoutUser] No refresh token found in localStorage to send for logout.');
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    console.log('[logoutUser] Tokens and user data cleared from localStorage.');
  }
}

// ============================================================================
// Building API Functions
// ============================================================================

export type Building = {
  id: number;
  name: string;
  address: string;
  city?: string;
  postal_code?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  total_apartments?: number;
  created_at: string;
  updated_at: string;
};

export type BuildingPayload = Partial<Omit<Building, 'id' | 'created_at' | 'updated_at' | 'latitude' | 'longitude'>> & {
  latitude?: number | null;
  longitude?: number | null;
};

export type BuildingsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Building[];
};

// Local buildings cache (backward compatibility)
let buildingsCache: { data: Building[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchAllBuildings(): Promise<Building[]> {
  const cacheKey = getCacheKey('/api/buildings/public/', { page_size: 1000, page: 1 });
  
  // Check global throttling cache first
  const cached = getCachedOrInFlight<Building[]>(cacheKey);
  if (cached) {
    return await cached;
  }

  // Check if we should throttle this request
  if (shouldThrottleRequest(cacheKey)) {
    console.log('[API THROTTLE] Request throttled, returning cached data');
    const cachedData = API_CALL_CACHE.get(cacheKey);
    if (cachedData && cachedData.data) return cachedData.data as Building[];
  }

  // Check local cache first (backward compatibility)
  if (buildingsCache && (Date.now() - buildingsCache.timestamp) < CACHE_DURATION) {
    console.log('[API CALL] Returning cached buildings');
    return buildingsCache.data;
  }

  console.log('[API CALL] Fetching all buildings');
  
  try {
    // Try to get all buildings with large page size
    const data = await apiGet<Paginated<Building>>('/buildings/public/', {
      page_size: 1000,
      page: 1
    });
    
    let buildings: Building[] = extractResults(data);
    
    // If paginated, fetch all pages
    const paginated = data as BuildingsResponse;
    if (paginated.next && paginated.count && buildings.length < paginated.count) {
      console.log('[API CALL] Pagination detected, fetching all pages...');
      let allBuildings = [...buildings];
      let nextUrl = paginated.next;
      
      while (nextUrl && allBuildings.length < paginated.count) {
        // Extract path from next URL
        const nextPath = nextUrl.startsWith('http') 
          ? new URL(nextUrl).pathname.replace('/api', '')
          : nextUrl.replace('/api', '');
        
        const nextData = await apiGet<Paginated<Building>>(nextPath);
        const nextBuildings = extractResults(nextData);
        allBuildings = [...allBuildings, ...nextBuildings];
        
        const nextPaginated = nextData as BuildingsResponse;
        nextUrl = nextPaginated.next || '';
        
        if (allBuildings.length >= paginated.count) break;
      }
      
      buildings = allBuildings;
    }
    
    // Cache the result
    buildingsCache = { data: buildings, timestamp: Date.now() };
    API_CALL_CACHE.set(cacheKey, { data: buildings, timestamp: Date.now() });
    
    return buildings;
  } catch (error) {
    console.error('[API CALL] Error fetching buildings:', error);
    throw error;
  }
}

export async function fetchAllBuildingsPublic(): Promise<Building[]> {
  return fetchAllBuildings();
}

export async function fetchBuildings(page: number = 1, pageSize: number = 50): Promise<BuildingsResponse> {
  const data = await apiGet<BuildingsResponse>('/buildings/public/', {
    page,
    page_size: pageSize
  });
  return data;
}

export async function fetchBuilding(id: number): Promise<Building> {
  return apiGet<Building>(`/buildings/${id}/`);
}

export async function createBuilding(payload: BuildingPayload): Promise<Building> {
  return apiPost<Building>('/buildings/', payload);
}

export async function updateBuilding(id: number, payload: BuildingPayload): Promise<Building> {
  return apiPatch<Building>(`/buildings/${id}/`, payload);
}

export async function deleteBuilding(id: number): Promise<void> {
  await apiDelete(`/buildings/${id}/`);
}

// ============================================================================
// Announcement API Functions
// ============================================================================

export type Announcement = {
  id: number;
  title: string;
  description: string;
  file: string | null;
  building?: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateAnnouncementPayload = {
  title: string;
  description: string;
  file?: File | null;
  building?: number | null;
};

export async function fetchAnnouncements(buildingId?: number | null): Promise<Announcement[]> {
  const params: Record<string, string | number> = {};
  if (buildingId) {
    params.building = buildingId;
  }
  
  const data = await apiGet<Paginated<Announcement>>('/announcements/', params);
  return extractResults(data);
}

export async function fetchAnnouncement(id: string | number): Promise<Announcement> {
  return apiGet<Announcement>(`/announcements/${id}/`);
}

export async function createAnnouncement(payload: CreateAnnouncementPayload): Promise<Announcement> {
  return apiPost<Announcement>('/announcements/', payload);
}

export async function deleteAnnouncement(announcementId: number): Promise<string> {
  await apiDelete(`/announcements/${announcementId}/`);
  return 'Announcement deleted successfully';
}

// ============================================================================
// Vote API Functions
// ============================================================================

export type Vote = {
  id: number;
  title: string;
  description: string;
  building?: number | null;
  created_at: string;
  updated_at: string;
  choices?: string[];
};

export type VoteSubmission = {
  id: number;
  vote: number;
  choice: string;
  user: number;
};

export type VoteResultsData = {
  [key: string]: number;
  total: number;
};

export type CreateVotePayload = {
  title: string;
  description: string;
  building?: number | null;
  choices: string[];
};

export async function fetchVotes(buildingId?: number | null): Promise<Vote[]> {
  const params: Record<string, string | number> = {};
  if (buildingId) {
    params.building = buildingId;
  }
  
  const data = await apiGet<Paginated<Vote>>('/votes/', params);
  return extractResults(data);
}

export async function fetchMyVote(voteId: number): Promise<VoteSubmission | null> {
  try {
    return await apiGet<VoteSubmission>(`/votes/${voteId}/my-vote/`);
  } catch (error: unknown) {
    const apiError = error as { status?: number };
    if (apiError.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function submitVote(voteId: number, choice: string): Promise<VoteSubmission> {
  return apiPost<VoteSubmission>(`/votes/${voteId}/submit/`, { choice });
}

export async function fetchVoteResults(voteId: number): Promise<VoteResultsData> {
  return apiGet<VoteResultsData>(`/votes/${voteId}/results/`);
}

export async function createVote(payload: CreateVotePayload): Promise<Vote> {
  return apiPost<Vote>('/votes/', payload);
}

export async function deleteVote(voteId: number): Promise<string> {
  await apiDelete(`/votes/${voteId}/`);
  return 'Vote deleted successfully';
}

// ============================================================================
// Request API Functions
// ============================================================================

import type { UserRequest } from '@/types/userRequests';

export type CreateUserRequestPayload = {
  title: string;
  description: string;
  building?: number | null;
  category?: string;
};

export type UpdateUserRequestPayload = Partial<CreateUserRequestPayload> & {
  status?: string;
};

export async function fetchRequests(filters: { status?: string; buildingId?: number | null } = {}): Promise<UserRequest[]> {
  const params: Record<string, string | number> = {};
  if (filters.status) {
    params.status = filters.status;
  }
  if (filters.buildingId) {
    params.building = filters.buildingId;
  }
  
  const data = await apiGet<Paginated<UserRequest>>('/user-requests/', params);
  return extractResults(data);
}

export async function fetchUserRequestsForBuilding(buildingId: number): Promise<UserRequest[]> {
  return fetchRequests({ buildingId });
}

export async function fetchTopRequests(buildingId: number | null): Promise<UserRequest[]> {
  const params: Record<string, string | number> = {};
  if (buildingId) {
    params.building = buildingId;
  }
  params.ordering = '-support_count';
  params.page_size = 10;
  
  const data = await apiGet<Paginated<UserRequest>>('/user-requests/', params);
  return extractResults(data);
}

export async function fetchRequest(id: number | string): Promise<UserRequest> {
  return apiGet<UserRequest>(`/user-requests/${id}/`);
}

export async function createUserRequest(payload: CreateUserRequestPayload): Promise<UserRequest> {
  return apiPost<UserRequest>('/user-requests/', payload);
}

export async function updateUserRequest(id: number, payload: UpdateUserRequestPayload): Promise<UserRequest> {
  return apiPatch<UserRequest>(`/user-requests/${id}/`, payload);
}

export async function deleteUserRequest(requestId: number): Promise<void> {
  await apiDelete(`/user-requests/${requestId}/`);
}

export async function toggleSupportRequest(
  id: number
): Promise<{ status: string; supporter_count: number; supported: boolean }> {
  return apiPost<{ status: string; supporter_count: number; supported: boolean }>(`/user-requests/${id}/support/`, {});
}

export async function fetchObligationsSummary(): Promise<{ pending_payments?: number; maintenance_tickets?: number }> {
  try {
    // Try the correct endpoint first (from old codebase)
    return await apiGet<{ pending_payments?: number; maintenance_tickets?: number }>('/obligations/summary/');
  } catch (error: unknown) {
    // If endpoint doesn't exist (404), return empty data instead of throwing
    const apiError = error as { status?: number; response?: { status?: number } };
    if (apiError?.status === 404 || apiError?.response?.status === 404) {
      console.warn('[fetchObligationsSummary] Endpoint not found, returning empty data');
      return { pending_payments: 0, maintenance_tickets: 0 };
    }
    // Re-throw other errors
    throw error;
  }
}

// ============================================================================
// Apartment API Functions
// ============================================================================

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
  participation_mills?: number;
  heating_mills?: number;
  elevator_mills?: number;
  tenant_name: string;
  tenant_phone: string;
  tenant_phone2: string;
  tenant_email: string;
  occupant_name: string;
  occupant_phone: string;
  occupant_phone2: string;
  occupant_email: string;
  square_meters?: number;
  bedrooms?: number;
  notes: string;
  status_display: string;
  created_at: string;
  updated_at: string;
};

export async function fetchApartments(buildingId: number): Promise<ApartmentList[]> {
  const data = await apiGet<Paginated<ApartmentList>>(`/apartments/`, { building: buildingId });
  return extractResults(data);
}

// ============================================================================
// API Instance Export (for backward compatibility)
// ============================================================================

/**
 * API instance for backward compatibility with old codebase
 * Uses fetch-based apiGet/apiPost/etc internally
 */
export const api = {
  get: async <T>(path: string): Promise<T> => {
    return apiGet<T>(path);
  },
  post: async <T>(path: string, body?: unknown): Promise<T> => {
    return apiPost<T>(path, body);
  },
  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    return apiPatch<T>(path, body);
  },
  delete: async <T>(path: string): Promise<T> => {
    return apiDelete<T>(path);
  },
  put: async <T>(path: string, body?: unknown): Promise<T> => {
    return apiPut<T>(path, body);
  },
};


