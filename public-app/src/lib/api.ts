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

/**
 * Invalidate API cache for paths matching a pattern
 * Used after mutations to ensure fresh data on next GET
 */
export function invalidateApiCache(pathPattern?: string | RegExp): void {
  if (!pathPattern) {
    // Clear all cache
    console.log('[API CACHE] Clearing all cache');
    API_CALL_CACHE.clear();
    return;
  }

  let pattern: RegExp;
  if (typeof pathPattern === 'string') {
    // Escape special regex characters but keep the pattern flexible
    const escapedPattern = pathPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the pattern anywhere in the URL (not just at the start)
    pattern = new RegExp(escapedPattern);
  } else {
    pattern = pathPattern;
  }

  let cleared = 0;
  const keysToDelete: string[] = [];
  
  for (const [key] of API_CALL_CACHE.entries()) {
    // Cache key format: "url_options" where url is the full URL
    // Extract the URL part (before the first underscore followed by {)
    const urlMatch = key.match(/^([^_]+(?:_[^{])*)/);
    const url = urlMatch ? urlMatch[1] : key;
    
    if (pattern.test(url) || pattern.test(key)) {
      keysToDelete.push(key);
      cleared++;
    }
  }
  
  // Delete outside the iteration to avoid iterator issues
  keysToDelete.forEach(key => API_CALL_CACHE.delete(key));
  
  if (cleared > 0) {
    console.log(`[API CACHE] Cleared ${cleared} cache entries matching pattern: ${pathPattern}`);
  }
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

/**
 * Attach a non-enumerable `data` property to API responses so callers that expect
 * Axios-style objects (response.data) continue to work while newer code can use
 * the raw payload directly.
 */
function attachApiResponseData<T>(payload: T): T {
  if (payload !== null && (typeof payload === 'object' || typeof payload === 'function')) {
    const target = payload as Record<string, unknown> & { data?: T };
    if (!Object.prototype.hasOwnProperty.call(target, 'data')) {
      try {
        Object.defineProperty(target, 'data', {
          value: payload,
          enumerable: false,
          configurable: true,
        });
      } catch {
        target.data = payload;
      }
    }
  }
  return payload;
}

const isNotFoundError = (error: unknown): boolean => {
  const err = error as { status?: number; response?: { status?: number } };
  return err?.status === 404 || err?.response?.status === 404;
};

const normalizeApiPath = (path: string): string => {
  if (!path) return "/api/";
  
  const [rawPath, ...queryParts] = path.split("?");
  const queryString = queryParts.length > 0 ? queryParts.join("?") : "";
  
  const prefixed = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  
  let normalizedPath: string;
  if (prefixed.startsWith("/api")) {
    // Ensure trailing slash for DRF compatibility
    const withApiPrefix = prefixed.startsWith("/api/") ? prefixed : `${prefixed}/`;
    normalizedPath = withApiPrefix.endsWith("/") ? withApiPrefix : `${withApiPrefix}/`;
  } else {
    const withApiPrefix = `/api${prefixed}`;
    normalizedPath = withApiPrefix.endsWith("/") ? withApiPrefix : `${withApiPrefix}/`;
  }
  
  return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
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
 * GET request helper with query parameters support and throttling & caching
 * Supports string, number, and boolean values for filters
 * Automatically filters out undefined/null values
 */
type ApiQueryValue = string | number | boolean | undefined;
type ApiQueryParams = Record<string, ApiQueryValue>;

function normalizeQueryParams(params?: Record<string, unknown> | { params?: Record<string, unknown> }): ApiQueryParams | undefined {
  if (!params) return undefined;

  const candidate =
    'params' in params && params.params && typeof params.params === 'object'
      ? params.params
      : params;

  const normalized: ApiQueryParams = {};
  Object.entries(candidate).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value;
    } else {
      normalized[key] = String(value);
    }
  });

  return Object.keys(normalized).length ? normalized : undefined;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, unknown> | { params?: Record<string, unknown> },
): Promise<T> {
  const apiUrl = getApiUrl(path);
  const url = new URL(apiUrl);
  const normalizedParams = normalizeQueryParams(params);
  
  // Preserve trailing slash - URL constructor removes it from pathname
  const hadTrailingSlash = apiUrl.endsWith('/') && !apiUrl.includes('?');
  if (hadTrailingSlash && !url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }
  
  if (normalizedParams) {
    Object.entries(normalizedParams).forEach(([k, v]) => {
      // Filter out undefined and null values
      if (v !== undefined && v !== null) {
        // Convert boolean to string ('true'/'false')
        // Convert number to string
        // Keep string as-is
        url.searchParams.set(k, String(v));
      }
    });
  }
  
  const urlString = url.toString();
  const cacheKey = getCacheKey(urlString, normalizedParams);
  
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
      
      const data = attachApiResponseData(await res.json() as T);
      
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
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      const headers = getHeaders('POST');
      if (isFormData) {
        delete headers['Content-Type'];
      }
      const requestInit: RequestInit = {
        method: "POST",
        headers,
        credentials: "include",
      };
      if (body !== undefined && body !== null) {
        requestInit.body = isFormData ? (body as FormData) : JSON.stringify(body);
      } else if (!isFormData) {
        // For empty JSON bodies ensure correct header but no body
        delete headers['Content-Type'];
      }

      const res = await fetch(url, {
        ...requestInit,
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
      
      const data = attachApiResponseData(await res.json() as T);
      
      // Invalidate ALL cache after successful mutation to ensure fresh data
      // Selective invalidation had issues with pattern matching
      invalidateApiCache(); // Clear entire cache
      
      return data;
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
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = getHeaders('PUT');
  if (isFormData) {
    delete headers['Content-Type'];
  }
  const requestInit: RequestInit = {
    method: "PUT",
    headers,
    credentials: "include",
  };
  if (body !== undefined && body !== null) {
    requestInit.body = isFormData ? (body as FormData) : JSON.stringify(body);
  } else if (!isFormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(url, requestInit);
  
  if (!res.ok) {
    const text = await res.text();
    throw createApiError("PUT", url, res.status, text);
  }
  
  const data = attachApiResponseData(await res.json() as T);
  
  // Invalidate ALL cache after successful mutation to ensure fresh data
  invalidateApiCache(); // Clear entire cache
  
  return data;
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const url = getApiUrl(path);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = getHeaders('PATCH');
  if (isFormData) {
    delete headers['Content-Type'];
  }
  const requestInit: RequestInit = {
    method: "PATCH",
    headers,
    credentials: "include",
  };
  if (body !== undefined && body !== null) {
    requestInit.body = isFormData ? (body as FormData) : JSON.stringify(body);
  } else if (!isFormData) {
    delete headers['Content-Type'];
  }

  console.log(`[API CALL] PATCH ${url}`, body ? { body } : '');
  const res = await fetch(url, requestInit);
  
  if (!res.ok) {
    const text = await res.text();
    console.error(`[API CALL] PATCH ${url} failed:`, res.status, text);
    throw createApiError("PATCH", url, res.status, text);
  }
  
  const data = attachApiResponseData(await res.json() as T);
  console.log(`[API CALL] ✓ PATCH ${url} successful`, data);
  
  // Invalidate ALL cache after successful mutation to ensure fresh data
  invalidateApiCache(); // Clear entire cache
  
  return data;
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
  
  // Invalidate ALL cache after successful deletion to ensure fresh data
  invalidateApiCache(); // Clear entire cache
  
  // DELETE might not return a body
  if (res.headers.get("content-type")?.includes("application/json")) {
    const data = attachApiResponseData(await res.json() as T);
    return data;
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
  apartments_count?: number;
  heating_system?: string;
  heating_fixed_percentage?: number;
  internal_manager_name?: string;
  internal_manager_phone?: string;
  internal_manager_apartment?: string;
  internal_manager_collection_schedule?: string;
  management_office_name?: string;
  management_office_phone?: string;
  management_office_address?: string;
  street_view_image?: string;
  financial_system_start_date?: string | null;
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
  const params = { page_size: 1000, page: 1 };
  const attemptOrder: Array<{ path: string; cacheKey: string }> = [
    { path: '/buildings/', cacheKey: getCacheKey('/api/buildings/', params) },
    { path: '/buildings/public/', cacheKey: getCacheKey('/api/buildings/public/', params) },
  ];

  // Check local cache first (backward compatibility)
  if (buildingsCache && (Date.now() - buildingsCache.timestamp) < CACHE_DURATION) {
    console.log('[API CALL] Returning cached buildings');
    return buildingsCache.data;
  }

  let lastError: unknown = null;

  for (const attempt of attemptOrder) {
    // Global throttling cache
    const cached = getCachedOrInFlight<Building[]>(attempt.cacheKey);
    if (cached) {
      return await cached;
    }

    if (shouldThrottleRequest(attempt.cacheKey)) {
      console.log('[API THROTTLE] Request throttled, returning cached data');
      const throttled = API_CALL_CACHE.get(attempt.cacheKey);
      if (throttled && throttled.data) {
        return throttled.data as Building[];
      }
    }

    console.log(`[API CALL] Fetching buildings from ${attempt.path}`);

    try {
      const data = await apiGet<Paginated<Building>>(attempt.path, params);

      let buildings: Building[] = extractResults(data);
      const paginated = data as BuildingsResponse;

      if (paginated.next && paginated.count && buildings.length < paginated.count) {
        console.log('[API CALL] Pagination detected, fetching all pages...');
        let allBuildings = [...buildings];
        let nextUrl = paginated.next;

        while (nextUrl && allBuildings.length < paginated.count) {
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

      // Cache the result for both per-path cache and legacy cache
      buildingsCache = { data: buildings, timestamp: Date.now() };
      API_CALL_CACHE.set(attempt.cacheKey, { data: buildings, timestamp: Date.now() });

      return buildings;
    } catch (error) {
      lastError = error;
      console.error(`[API CALL] Error fetching buildings from ${attempt.path}:`, error);
      // Try next fallback path
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch buildings');
}

// Public API call without authentication headers (for kiosk display)
async function apiGetPublic<T>(
  path: string,
  params?: Record<string, unknown> | { params?: Record<string, unknown> },
): Promise<T> {
  const apiUrl = getApiUrl(path);
  const url = new URL(apiUrl);
  const normalizedParams = normalizeQueryParams(params);
  
  // Preserve trailing slash
  const hadTrailingSlash = apiUrl.endsWith('/') && !apiUrl.includes('?');
  if (hadTrailingSlash && !url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }
  
  if (normalizedParams) {
    Object.entries(normalizedParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    });
  }
  
  const urlString = url.toString();
  
  const res = await fetch(urlString, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
  
  if (!res.ok) {
    throw createApiError("GET", urlString, res.status);
  }
  
  return await res.json() as T;
}

export async function fetchAllBuildingsPublic(): Promise<Building[]> {
  const params = { page_size: 1000, page: 1 };
  
  // Try public endpoint first
  try {
    console.log('[API CALL] Fetching buildings from /buildings/public/');
    const data = await apiGetPublic<Paginated<Building>>('/buildings/public/', params);
    
    let buildings: Building[] = extractResults(data);
    const paginated = data as BuildingsResponse;
    
    // Handle pagination if needed
    if (paginated.next && paginated.count && buildings.length < paginated.count) {
      console.log('[API CALL] Pagination detected, fetching all pages...');
      let allBuildings = [...buildings];
      let nextUrl = paginated.next;
      
      while (nextUrl && allBuildings.length < paginated.count) {
        const nextPath = nextUrl.startsWith('http')
          ? new URL(nextUrl).pathname.replace('/api', '')
          : nextUrl.replace('/api', '');
        
        const nextData = await apiGetPublic<Paginated<Building>>(nextPath);
        const nextBuildings = extractResults(nextData);
        allBuildings = [...allBuildings, ...nextBuildings];
        
        const nextPaginated = nextData as BuildingsResponse;
        nextUrl = nextPaginated.next || '';
        
        if (allBuildings.length >= paginated.count) break;
      }
      
      buildings = allBuildings;
    }
    
    return buildings;
  } catch (error) {
    console.error('[API CALL] Error fetching buildings from /buildings/public/:', error);
    // Fallback to regular fetchAllBuildings if public endpoint fails
    console.log('[API CALL] Falling back to authenticated endpoint');
    return fetchAllBuildings();
  }
}

export async function fetchBuildings(page: number = 1, pageSize: number = 50): Promise<BuildingsResponse> {
  const params = { page, page_size: pageSize };
  const paths = ['/buildings/', '/buildings/public/'];
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await apiGet<BuildingsResponse>(path, params);
    } catch (error) {
      lastError = error;
      console.error(`[API CALL] Error fetching buildings list from ${path}:`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch buildings list');
}

export async function fetchBuilding(id: number): Promise<Building> {
  return apiGet<Building>(`/buildings/list/${id}/`);
}

export async function createBuilding(payload: BuildingPayload): Promise<Building> {
  return apiPost<Building>('/buildings/list/', payload);
}

export async function updateBuilding(id: number, payload: BuildingPayload): Promise<Building> {
  return apiPatch<Building>(`/buildings/list/${id}/`, payload);
}

export async function deleteBuilding(id: number): Promise<void> {
  await apiDelete(`/buildings/list/${id}/`);
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
  try {
    const data = await apiGet<Paginated<Announcement>>('/announcements/', params);
    return extractResults(data);
  } catch (error) {
    if (isNotFoundError(error)) {
      console.warn('[fetchAnnouncements] Endpoint returned 404, returning empty list');
      return [];
    }
    throw error;
  }
}

export async function fetchAnnouncement(id: string | number): Promise<Announcement> {
  return apiGet<Announcement>(`/announcements/${id}/`);
}

export async function createAnnouncement(payload: CreateAnnouncementPayload): Promise<Announcement> {
  return apiPost<Announcement>('/announcements/', payload);
}

export async function deleteAnnouncement(announcementId: number): Promise<string> {
  await apiDelete(`/announcements/${announcementId}/`);
  return 'Η ανακοίνωση διαγράφηκε επιτυχώς';
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
  try {
    const data = await apiGet<Paginated<Vote>>('/votes/', params);
    return extractResults(data);
  } catch (error) {
    if (isNotFoundError(error)) {
      console.warn('[fetchVotes] Endpoint returned 404, returning empty list');
      return [];
    }
    throw error;
  }
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
  return 'Η ψηφοφορία διαγράφηκε επιτυχώς';
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
  try {
    const data = await apiGet<Paginated<UserRequest>>('/user-requests/', params);
    return extractResults(data);
  } catch (error) {
    if (isNotFoundError(error)) {
      console.warn('[fetchRequests] Endpoint returned 404, returning empty list');
      return [];
    }
    throw error;
  }
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
  try {
    const data = await apiGet<Paginated<UserRequest>>('/user-requests/', params);
    return extractResults(data);
  } catch (error) {
    if (isNotFoundError(error)) {
      console.warn('[fetchTopRequests] Endpoint returned 404, returning empty list');
      return [];
    }
    throw error;
  }
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
  try {
    const data = await apiGet<Paginated<ApartmentList>>(`/apartments/`, { building: buildingId });
    return extractResults(data);
  } catch (error) {
    if (isNotFoundError(error)) {
      console.warn('[fetchApartments] Endpoint returned 404, returning empty list');
      return [];
    }
    throw error;
  }
}

export type BuildingResident = {
  id: string;
  apartment_id: number;
  apartment_number: string;
  name: string;
  phone: string;
  email: string;
  type: 'owner' | 'tenant';
  display_text: string;
};

export type BuildingResidentsResponse = {
  residents: BuildingResident[];
};

export async function fetchBuildingResidents(buildingId: number): Promise<BuildingResidentsResponse> {
  try {
    const data = await apiGet<BuildingResidentsResponse>(`/buildings/list/${buildingId}/residents/`);
    return data;
  } catch (error) {
    if (isNotFoundError(error)) {
      console.warn('[fetchBuildingResidents] Endpoint returned 404, returning empty list');
      return { residents: [] };
    }
    throw error;
  }
}

// ============================================================================
// API Instance Export (for backward compatibility)
// ============================================================================

/**
 * API instance for backward compatibility with old codebase
 * Uses fetch-based apiGet/apiPost/etc internally
 */
export const api = {
  /**
   * GET request with optional query parameters/filters
   * Supports both direct params object and axios-style { params: {...} } format
   * @param path - API path (e.g., '/maintenance/scheduled/')
   * @param params - Query parameters object (e.g., { building: 1, status: 'active' }) or axios-style { params: { building: 1 } }
   * @example
   * // Simple GET
   * const data = await api.get('/users/me/');
   * 
   * // GET with direct params (recommended)
   * const scheduled = await api.get('/maintenance/scheduled/', {
   *   building: 1,
   *   status: 'in_progress',
   *   priority: 'urgent',
   *   ordering: 'scheduled_date',
   *   limit: 100
   * });
   * 
   * // GET with axios-style params (backward compatibility)
   * const offers = await api.get('/projects/offers/', { params: { status: 'submitted' } });
   */
  get: async <T>(path: string, params?: Record<string, unknown> | { params?: Record<string, unknown> }): Promise<T> => {
    return apiGet<T>(path, params);
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

// ============================================================================
// Request Retry Logic (for backward compatibility)
// ============================================================================

/**
 * Enhanced request wrapper with retry logic for rate limiting
 * For backward compatibility with old codebase
 */
export const makeRequestWithRetry = async (
  requestConfig: { method: string; url: string; data?: unknown },
  maxAttempts: number = 3
): Promise<{ data: unknown }> => {
  let lastError: unknown = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      let result: unknown;
      
      switch (requestConfig.method.toLowerCase()) {
        case 'get':
          result = await apiGet(requestConfig.url);
          break;
        case 'post':
          result = await apiPost(requestConfig.url, requestConfig.data);
          break;
        case 'patch':
          result = await apiPatch(requestConfig.url, requestConfig.data);
          break;
        case 'delete':
          result = await apiDelete(requestConfig.url);
          break;
        case 'put':
          result = await apiPut(requestConfig.url, requestConfig.data);
          break;
        default:
          throw new Error(`Unsupported method: ${requestConfig.method}`);
      }
      
      // Reset retry delay on successful request
      resetRetryDelay(requestConfig.url || 'unknown');
      return { data: result };
    } catch (error: unknown) {
      lastError = error;
      const apiError = error as { status?: number; response?: { status?: number } };
      
      // Only retry on 429 (rate limit) or certain network errors
      if (apiError?.status === 429 || apiError?.response?.status === 429) {
        if (attempt < maxAttempts) {
          console.warn(`Request failed (attempt ${attempt}/${maxAttempts}), retrying...`, {
            status: apiError?.status || apiError?.response?.status,
            url: requestConfig.url,
          });
          
          // Use exponential backoff for 429 errors per endpoint
          const delayMs = getRetryDelay(requestConfig.url || 'unknown');
          console.log(`[429 BACKOFF] Waiting ${delayMs}ms for ${requestConfig.url}`);
          
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }
      
      // Don't retry on other errors
      throw error;
    }
  }
  
  // If we get here, all attempts failed
  throw lastError || new Error('Request failed after all retry attempts');
};

// ============================================================================
// Maintenance API Functions (for ExpenseList)
// ============================================================================

// ============================================================================
// 📅 MAINTENANCE: SCHEDULED MAINTENANCE API FUNCTIONS
// ============================================================================

export type ScheduledMaintenance = {
  id: number;
  title: string;
  description: string;
  building: number;
  contractor?: number | null;
  contractor_name?: string;
  contractor_contact?: string;
  contractor_phone?: string;
  contractor_email?: string;
  scheduled_date?: string | null;
  estimated_duration?: number | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  estimated_cost?: number | null;
  total_cost?: number | null;
  actual_cost?: number | null;
  payment_method?: string;
  installments?: number;
  advance_payment?: number | null;
  payment_terms?: string;
  payment_config?: {
    enabled: boolean;
    payment_type?: 'lump_sum' | 'advance_installments' | 'periodic' | 'milestone_based';
    total_amount?: number;
    advance_percentage?: number;
    installment_count?: number;
    installment_frequency?: 'weekly' | 'biweekly' | 'monthly';
    periodic_amount?: number;
    periodic_frequency?: 'weekly' | 'biweekly' | 'monthly';
    start_date?: string;
    notes?: string;
  };
  payment_schedule?: any; // Full payment schedule data from backend
};

export async function fetchScheduledMaintenances(params: { buildingId?: number; priority?: string; ordering?: string } = {}): Promise<ScheduledMaintenance[]> {
  const searchParams: Record<string, string | number | undefined> = {};
  if (params.buildingId) searchParams.building = params.buildingId;
  if (params.priority) searchParams.priority = params.priority;
  if (params.ordering) searchParams.ordering = params.ordering;
  
  const data = await api.get<ScheduledMaintenance[] | { results: ScheduledMaintenance[] }>('/api/maintenance/scheduled/', searchParams);
  return Array.isArray(data) ? data : data?.results || [];
}

export async function fetchScheduledMaintenance(id: number): Promise<ScheduledMaintenance> {
  return await api.get<ScheduledMaintenance>(`/api/maintenance/scheduled/${id}/`);
}

export async function createScheduledMaintenance(payload: Omit<ScheduledMaintenance, 'id'>): Promise<ScheduledMaintenance> {
  return await api.post<ScheduledMaintenance>('/api/maintenance/scheduled/', payload);
}

export async function updateScheduledMaintenance(
  id: number,
  payload: Partial<Omit<ScheduledMaintenance, 'id'>>
): Promise<ScheduledMaintenance> {
  return await api.patch<ScheduledMaintenance>(`/api/maintenance/scheduled/${id}/`, payload);
}

// ============================================================================
// 🧾 MAINTENANCE: SERVICE RECEIPTS API FUNCTIONS
// ============================================================================

export type ServiceReceipt = {
  id: number;
  contractor: number;
  building: number;
  service_date: string;
  amount: number | string;
  receipt_file?: string | null;
  description: string;
  invoice_number?: string | null;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date?: string | null;
  created_at: string;
  // Explicit links (optional; require backend support)
  expense?: number | null;
  scheduled_maintenance?: number | null;
};

export async function fetchServiceReceipts(params: { buildingId?: number } = {}): Promise<ServiceReceipt[]> {
  const searchParams: Record<string, string | number | undefined> = {};
  if (params.buildingId) searchParams.building = params.buildingId;
  
  const data = await api.get<ServiceReceipt[] | { results: ServiceReceipt[] }>('/api/maintenance/receipts/', searchParams);
  return Array.isArray(data) ? data : data?.results || [];
}

export async function fetchServiceReceipt(id: number): Promise<ServiceReceipt> {
  return await api.get<ServiceReceipt>(`/api/maintenance/receipts/${id}/`);
}

export async function createServiceReceipt(payload: {
  contractor: number;
  building: number;
  service_date: string;
  amount: string | number;
  description: string;
  invoice_number?: string;
  payment_status?: 'pending' | 'paid' | 'overdue';
  receipt_file?: File;
  // Explicit links (optional)
  expense?: number;
  scheduled_maintenance?: number;
}): Promise<ServiceReceipt> {
  const form = new FormData();
  form.append('contractor', String(payload.contractor));
  form.append('building', String(payload.building));
  form.append('service_date', payload.service_date);
  form.append('amount', String(payload.amount));
  form.append('description', payload.description);
  if (payload.invoice_number) form.append('invoice_number', payload.invoice_number);
  form.append('payment_status', payload.payment_status ?? 'pending');
  if (payload.receipt_file) form.append('receipt_file', payload.receipt_file);
  if (typeof payload.expense === 'number') form.append('expense', String(payload.expense));
  if (typeof payload.scheduled_maintenance === 'number') form.append('scheduled_maintenance', String(payload.scheduled_maintenance));
  
  // Use fetch directly for FormData (can't use api.post with FormData)
  const url = getApiUrl('/api/maintenance/receipts/');
  const headers = getHeaders('POST');
  // Remove Content-Type header to let browser set it with boundary for FormData
  delete headers['Content-Type'];
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: form,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw createApiError('POST', url, response.status, errorText);
  }
  
  const data = attachApiResponseData(await response.json() as ServiceReceipt);
  return data;
}

export async function updateServiceReceipt(
  id: number,
  payload: Partial<Omit<ServiceReceipt, 'id' | 'created_at'>>
): Promise<ServiceReceipt> {
  return await api.patch<ServiceReceipt>(`/api/maintenance/receipts/${id}/`, payload);
}

export async function deleteServiceReceipt(id: number): Promise<void> {
  await api.delete(`/api/maintenance/receipts/${id}/`);
}

// ============================================================================
// Apartment Financial Data API Functions
// ============================================================================

export async function fetchApartmentsWithFinancialData(buildingId: number, month?: string): Promise<any[]> {
  console.log('[API CALL] Attempting to fetch apartments with financial data:', buildingId, 'month:', month);
  
  try {
    // Use the apartment_balances endpoint which has expense_share data
    const params: Record<string, string> = {
      building_id: buildingId.toString()
    };
    if (month) {
      params.month = month;
    }
    
    // The apiGet returns data directly
    const response = await apiGet<{ apartments?: any[] } | any[]>(`/financial/dashboard/apartment_balances/`, params);
    
    // Handle both object with apartments property and direct array
    const result = Array.isArray(response) ? response : (response as { apartments?: any[] }).apartments || [];
    
    console.log('[API CALL] Successfully fetched apartments with financial data:', {
      resultType: typeof result,
      isArray: Array.isArray(result),
      length: Array.isArray(result) ? result.length : 'N/A',
    });
    
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    // If the optimized endpoint doesn't exist, fall back to individual calls
    console.warn('Batch endpoint not available, using fallback');
    return await fetchApartmentsWithFinancialDataFallback(buildingId);
  }
}

// Fallback method with throttling to prevent rate limiting
async function fetchApartmentsWithFinancialDataFallback(buildingId: number): Promise<any[]> {
  console.log('[API CALL] Using fallback method with throttling for building:', buildingId);
  
  try {
    // Get apartments first
    const apartments = await fetchApartments(buildingId);
    
    // Process apartments in batches to avoid rate limiting
    const apartmentsWithFinancialData = [];
    const BATCH_SIZE = 3;
    const DELAY_BETWEEN_BATCHES = 500;
    
    for (let i = 0; i < apartments.length; i += BATCH_SIZE) {
      const batch = apartments.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (apartment: any) => {
        try {
          // The apiGet returns data directly
          const paymentsResponse = await apiGet<{ results?: any[] } | any[]>(`/financial/payments/`, {
            building_id: buildingId.toString(),
            apartment: apartment.id.toString()
          });
          
          const payments = Array.isArray(paymentsResponse) 
            ? paymentsResponse 
            : (paymentsResponse as { results?: any[] }).results || [];
          
          const sortedPayments = Array.isArray(payments)
            ? [...payments].sort((a, b) => {
                const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateDiff !== 0) return dateDiff;
                const aId = typeof a.id === 'number' ? a.id : parseInt(String(a.id), 10) || 0;
                const bId = typeof b.id === 'number' ? b.id : parseInt(String(b.id), 10) || 0;
                return bId - aId;
              })
            : [];
          const latestPayment = sortedPayments.length > 0 ? sortedPayments[0] : null;
          
          return {
            id: apartment.id,
            number: apartment.number,
            owner_name: apartment.owner_name,
            tenant_name: apartment.tenant_name,
            current_balance: latestPayment?.current_balance || 0,
            monthly_due: latestPayment?.monthly_due || 0,
            building_id: apartment.building,
            building_name: apartment.building_name,
            participation_mills: apartment.participation_mills,
            heating_mills: apartment.heating_mills,
            elevator_mills: apartment.elevator_mills,
            latest_payment_date: latestPayment?.date,
            latest_payment_amount: latestPayment?.amount,
          };
        } catch (err) {
          console.warn(`Failed to get financial data for apartment ${apartment.id}:`, err);
          return {
            id: apartment.id,
            number: apartment.number,
            owner_name: apartment.owner_name,
            tenant_name: apartment.tenant_name,
            current_balance: 0,
            monthly_due: 0,
            building_id: apartment.building,
            building_name: apartment.building_name,
            participation_mills: apartment.participation_mills,
            heating_mills: apartment.heating_mills,
            elevator_mills: apartment.elevator_mills,
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      apartmentsWithFinancialData.push(...batchResults);
      
      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < apartments.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    return apartmentsWithFinancialData;
  } catch (error) {
    console.error('[API CALL] Error in fallback method:', error);
    return [];
  }
}

// ============================================================================
// Service Package API Functions
// ============================================================================

export type ServicePackage = {
  id: number;
  name: string;
  description: string;
  fee_per_apartment: number;
  services_included: string[];
  services_list: string;
  total_cost_for_building: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ServicePackagesResponse = {
  results: ServicePackage[];
  count: number;
  next: string | null;
  previous: string | null;
};

export async function fetchServicePackages(buildingId?: number): Promise<ServicePackage[]> {
  console.log('[API CALL] Fetching service packages');
  try {
    const params: Record<string, string> = {};
    if (buildingId) {
      params.building_id = buildingId.toString();
    }
    
    // The apiGet returns data directly
    const response = await apiGet<ServicePackagesResponse | ServicePackage[]>(`/buildings/service-packages/`, params);
    
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response)) {
      return response;
    }
    
    const paginatedResponse = response as ServicePackagesResponse;
    return paginatedResponse.results || [];
  } catch (error) {
    console.error('[API CALL] Error fetching service packages:', error);
    throw error;
  }
}

export async function createServicePackage(packageData: Partial<ServicePackage>): Promise<ServicePackage> {
  console.log('[API CALL] Creating service package:', packageData);
  try {
    // The apiPost returns data directly
    const response = await apiPost<ServicePackage>('/buildings/service-packages/', packageData);
    console.log('[API CALL] Create service package response:', response);
    return response;
  } catch (error) {
    console.error('[API CALL] Error creating service package:', error);
    throw error;
  }
}

export async function updateServicePackage(packageId: number, packageData: Partial<ServicePackage>): Promise<ServicePackage> {
  console.log(`[API CALL] Updating service package ${packageId}:`, packageData);
  try {
    // The apiPatch returns data directly
    const response = await apiPatch<ServicePackage>(`/buildings/service-packages/${packageId}/`, packageData);
    console.log('[API CALL] Update service package response:', response);
    return response;
  } catch (error) {
    console.error('[API CALL] Error updating service package:', error);
    throw error;
  }
}

export async function deleteServicePackage(packageId: number): Promise<void> {
  console.log(`[API CALL] Deleting service package ${packageId}`);
  try {
    await apiDelete(`/buildings/service-packages/${packageId}/`);
    console.log('[API CALL] Service package deleted successfully');
  } catch (error) {
    console.error('[API CALL] Error deleting service package:', error);
    throw error;
  }
}

export async function applyServicePackageToBuilding(packageId: number, buildingId: number): Promise<unknown> {
  console.log(`[API CALL] Applying service package ${packageId} to building ${buildingId}`);
  try {
    // The apiPost returns data directly
    const response = await apiPost(`/buildings/service-packages/${packageId}/apply_to_building/`, {
      building_id: buildingId
    });
    console.log('[API CALL] Apply service package response:', response);
    return response;
  } catch (error) {
    console.error('[API CALL] Error applying service package:', error);
    throw error;
  }
}

// ============================================================================
// 🛠️ MAINTENANCE: CONTRACTORS API FUNCTIONS
// ============================================================================

export type Supplier = {
  id: number;
  name: string;
  category: string;
  status: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  vat_number: string;
  contract_number: string;
  rating: number;
  reliability_score: number;
  response_time_hours: number;
  emergency_contact: string;
  emergency_phone: string;
  is_active: boolean;
  created_at: string;
};

export type Contractor = {
  id: number;
  name: string;
  service_type: string;
  status: string;
  contact_person: string;
  phone: string;
  email: string;
  rating: number;
  reliability_score: number;
  response_time_hours: number;
  hourly_rate: number;
  availability: string;
  is_active: boolean;
  created_at: string;
};

export async function fetchSuppliers(buildingId?: number): Promise<Supplier[]> {
  const params: Record<string, string | number | undefined> = {};
  if (buildingId) params.building = buildingId;
  
  const response = await api.get<Supplier[] | { results: Supplier[] }>('/api/financial/suppliers/', params);
  return Array.isArray(response) ? response : response?.results || [];
}

export async function fetchContractors(): Promise<Contractor[]> {
  const response = await api.get<Contractor[] | { results: Contractor[] }>('/api/maintenance/contractors/');
  return Array.isArray(response) ? response : response?.results || [];
}

export async function createContractor(
  payload: Partial<Omit<Contractor, 'id' | 'created_at'>>
): Promise<Contractor> {
  return await api.post<Contractor>('/api/maintenance/contractors/', payload);
}

export async function updateContractor(
  id: number,
  payload: Partial<Omit<Contractor, 'id' | 'created_at'>>
): Promise<Contractor> {
  return await api.patch<Contractor>(`/api/maintenance/contractors/${id}/`, payload);
}

export async function deleteContractor(id: number): Promise<void> {
  await api.delete(`/api/maintenance/contractors/${id}/`);
}

export async function fetchContractor(id: number): Promise<Contractor> {
  return await api.get<Contractor>(`/api/maintenance/contractors/${id}/`);
}
