"use client";

import { ensureApiUrl, getDefaultRemoteApiUrl, isLocalHostname } from "@/lib/apiBase";

// Global API call throttling
const API_CALL_CACHE = new Map<string, { data: any, timestamp: number, promise?: Promise<any> }>();
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

function getCacheKey(url: string, options: any = {}): string {
  return `${url}_${JSON.stringify(options)}`;
}

function shouldThrottleRequest(cacheKey: string): boolean {
  const cached = API_CALL_CACHE.get(cacheKey);
  if (!cached) return false;
  
  const timeSinceLastCall = Date.now() - cached.timestamp;
  return timeSinceLastCall < MIN_REQUEST_INTERVAL;
}

function getCachedOrInFlight(cacheKey: string): any {
  const cached = API_CALL_CACHE.get(cacheKey);
  if (!cached) return null;
  
  // If there's an in-flight request, return that promise
  if (cached.promise) return cached.promise;
  
  // If data is less than 5 minutes old, return cached data
  const age = Date.now() - cached.timestamp;
  if (age < 5 * 60 * 1000) { // 5 minutes cache
    console.log(`[API THROTTLE] Returning cached data for ${cacheKey}`);
    return Promise.resolve(cached.data);
  }
  
  return null;
}

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    // Client-side - check if we're on Vercel and use Railway backend
    const hostname = window.location.hostname;
    console.log('[API BASE] Current hostname:', hostname);
    if (hostname.includes('vercel.app') || hostname.includes('railway.app')) {
      // Use Railway backend directly for production deployments
      console.log('[API BASE] Using Railway backend for production');
      return 'https://linuxversion-production.up.railway.app';
    }
    // For localhost, use same origin
    console.log('[API BASE] Using same origin for localhost');
    return window.location.origin;
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL as string;
  }
  return 'http://backend:8000';
}

const FALLBACK_REMOTE_API_URL = getDefaultRemoteApiUrl();

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const base = getApiBase();
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access') || localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url.toString(), { headers, credentials: 'include' });
  if (!res.ok) {
    const error: any = new Error(`GET ${url} failed: ${res.status}`);
    error.status = res.status;
    error.response = { status: res.status };
    throw error;
  }
  return res.json();
}

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

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const base = (typeof window !== 'undefined' && path.startsWith('/api/'))
    ? window.location.origin
    : getApiBase();
  const url = new URL(path, base);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access') || localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    const error: any = new Error(`POST ${url} failed: ${res.status} ${text}`);
    error.status = res.status;
    error.response = { status: res.status };
    throw error;
  }
  return res.json();
}
// Helper για όλα τα calls στο backend
import axios, { AxiosResponse, AxiosRequestHeaders, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { UserRequest } from '@/types/userRequests';
export type { UserRequest };
import type { User } from '@/types/user';
import { apiPublic } from './apiPublic';

// Re-export apiPublic for other modules
export { apiPublic };
import { toast } from '@/hooks/use-toast';

// Βασικό URL του API.
// - Σε Vercel/preview/prod: χρησιμοποιούμε same-origin '/api' για να δουλεύουν τα rewrites χωρίς CORS
// - Αν υπάρχει ρητό env, το τιμάμε
// - Server-side: προτιμάμε ρητό API_URL, αλλιώς fallback
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    (window as any).debugApiCalls = true;
    const hostname = window.location.hostname;

    // On Vercel (including custom domains), use same-origin '/api' to leverage rewrites
    // Check for Vercel deployment OR custom domains (newconcierge.app)
    const isVercelDeployment = hostname.includes('vercel.app') || 
                               hostname === 'newconcierge.app' || 
                               hostname.endsWith('.newconcierge.app') ||
                               (typeof process !== 'undefined' && process.env.VERCEL === '1');
    
    if (isVercelDeployment) {
      console.log('[API] Using same-origin /api via Vercel rewrites (custom domain detected)');
      return '/api';
    }

    // Local dev: same-origin '/api' (reverse proxy)
    if (isLocalHostname(hostname)) {
      console.log('[API] Using same-origin /api for local development');
      return '/api';
    }

    // Αν έχει οριστεί ρητά env, χρησιμοποίησέ το
    const envApiUrl = ensureApiUrl(process.env.NEXT_PUBLIC_API_URL);
    if (envApiUrl) {
      console.log(`[API] Using backend URL from env: ${envApiUrl}`);
      return envApiUrl;
    }

    // Fallback σε remote
    const remote = FALLBACK_REMOTE_API_URL;
    console.warn(`[API] NEXT_PUBLIC_API_URL missing. Falling back to remote: ${remote}`);
    return remote;
  }

  // Server-side: προτίμησε ρητό API_URL (ή NEXT_PUBLIC_API_URL) αλλιώς remote default
  const serverEnvUrl = ensureApiUrl(process.env.API_URL) || ensureApiUrl(process.env.NEXT_PUBLIC_API_URL);
  if (serverEnvUrl) {
    console.log(`[API] Using server-side API URL: ${serverEnvUrl}`);
    return serverEnvUrl;
  }
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    console.warn('[API] API_URL not configured on server. Using fallback remote API URL.');
    return FALLBACK_REMOTE_API_URL;
  }
  const localDefault = 'http://backend:8000/api';
  console.log(`[API] Using server-side API URL: ${localDefault}`);
  return localDefault;
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 60000, // Increased timeout for financial operations
  maxRedirects: 5, // Follow redirects (e.g., /api/users/me -> /api/users/me/)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Exponential backoff utility for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const exponentialBackoff = async (attempt: number, maxAttempts: number = 3): Promise<number> => {
  if (attempt > maxAttempts) {
    throw new Error('Max retry attempts exceeded');
  }
  const baseDelay = 1000; // 1 second
  const backoffDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * backoffDelay; // Add 10% jitter
  return backoffDelay + jitter;
};

// Enhanced request wrapper with retry logic for rate limiting
export const makeRequestWithRetry = async (requestConfig: any, maxAttempts: number = 3): Promise<any> => {
  let lastError: AxiosError | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await api(requestConfig);
      // Reset retry delay on successful request
      resetRetryDelay(requestConfig.url || 'unknown');
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Only retry on 429 (rate limit) or certain network errors
      if (error.response?.status === 429 || 
          (error.code === 'ECONNABORTED' && attempt < maxAttempts)) {
        
        console.warn(`Request failed (attempt ${attempt}/${maxAttempts}), retrying...`, {
          status: error.response?.status,
          url: requestConfig.url,
        });
        
        let delayMs;
        if (error.response?.status === 429) {
          // Use exponential backoff for 429 errors per endpoint
          delayMs = getRetryDelay(requestConfig.url || 'unknown');
          console.log(`[429 BACKOFF] Waiting ${delayMs}ms for ${requestConfig.url}`);
        } else {
          delayMs = await exponentialBackoff(attempt, maxAttempts);
        }
        
        await delay(delayMs);
        continue;
      }
      
      // For other errors, don't retry
      throw error;
    }
  }
  
  throw lastError;
};


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
    // 🔧 FIX: Ensure baseURL is correct for client-side requests
    // The module might be initialized server-side with wrong baseURL
    if (typeof window !== 'undefined') {
      const correctBaseURL = getApiBaseUrl();
      if (config.baseURL !== correctBaseURL) {
        config.baseURL = correctBaseURL;
      }
    }

    // Normalize duplicated /api segments when baseURL already includes /api
    if (typeof config.url === 'string') {
      const baseSource = (config.baseURL ?? api.defaults.baseURL ?? '') as string;
      const normalizedBase = baseSource.replace(/\/+$/, '');
      const hasApiSuffix = normalizedBase.endsWith('/api');
      const isRelativeApiCall = config.url.startsWith('/api/');

      // Strip /api prefix if both baseURL ends with /api AND url starts with /api/
      // This prevents /api/api/users/register (double /api)
      if (hasApiSuffix && isRelativeApiCall) {
        config.url = config.url.replace(/^\/api\/?/, '/');
        console.log(`[API INTERCEPTOR] Normalized URL: ${baseSource} + ${config.url}`);
      }
    }

    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
    }
    const access = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
    
    // Debug logs μόνο σε development και μόνο για errors
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (access && access.length > 0 && !config.url?.includes('/users/login/') && !config.url?.includes('/users/token/refresh/')) {
      config.headers.Authorization = `Bearer ${access}`;
    } else if (!config.url?.includes('/users/login/') && !config.url?.includes('/users/token/refresh/')) {
      // Log μόνο αν δεν υπάρχει token (potential issue)
      if (isDevelopment && !access) {
        console.warn(`[API] No auth token for: ${config.url}`);
      }
    }

    // CSRF Token Logic
    const method = (config.method ?? '').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }

    // X-Tenant-Schema header for subdomain-based tenant routing
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      // Extract subdomain if hostname has 3+ parts (e.g., alpha.newconcierge.app -> alpha)
      if (parts.length >= 3) {
        const tenant = parts[0];
        // Only add header if subdomain is not 'newconcierge', 'www', or 'localhost'
        if (tenant && tenant !== 'newconcierge' && tenant !== 'www' && !tenant.includes('localhost')) {
          config.headers['X-Tenant-Schema'] = tenant;
          console.log(`[API INTERCEPTOR] Added X-Tenant-Schema header: ${tenant}`);
        }
      }
    }

    return config;
  },
  (error) => {
    console.error('[AXIOS REQ INTERCEPTOR] Σφάλμα στο αίτημα:', error);
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

import { handleApiError, shouldRetry } from './apiUtils';

// Response Interceptor (για χειρισμό ληγμένων tokens και retry logic)
function shouldAttemptTokenRefresh(
  error: AxiosError,
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean }
): boolean {
  const isLogin = originalRequest?.url?.includes('/users/login/');
  const isRefresh = originalRequest?.url?.includes('/users/token/refresh/');
  const hasRefresh = typeof window !== 'undefined' && !!localStorage.getItem('refresh');

  return (
    error.response?.status === 401 &&
    !originalRequest._retry &&
    !isLogin &&
    !isRefresh &&
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
    try {
      const method = (response.config?.method || '').toUpperCase();
      const cfg: any = response.config || {};
      const successHeader = (cfg.xToastSuccess as string | undefined) ?? (response.config?.headers?.['X-Toast-Success'] as string | undefined);
      const suppressToastValue = cfg.xToastSuppress as boolean | undefined;
      const suppressToastHeader = response.config?.headers?.['X-Toast-Suppress'] as string | undefined;
      const suppressToast = typeof suppressToastValue === 'boolean' ? suppressToastValue : (suppressToastHeader === 'true');
      const errorHeader = (cfg.xToastError as string | undefined) ?? (response.config?.headers?.['X-Toast-Error'] as string | undefined);
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      if (isMutation && !suppressToast) {
        const defaultMsg =
          method === 'POST' ? 'Αποθηκεύτηκε επιτυχώς'
          : method === 'PUT' || method === 'PATCH' ? 'Ενημερώθηκε επιτυχώς'
          : method === 'DELETE' ? 'Διαγράφηκε επιτυχώς'
          : 'Επιτυχής ενέργεια';
        const title = successHeader && successHeader.length > 0 ? successHeader : defaultMsg;
        toast({ title });
      }
    } catch {}
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _rateLimitRetry?: boolean };

    console.log('%c[AXIOS RES INTERCEPTOR] Σφάλμα:', 'color: red; font-weight: bold;');
    console.log('Status code:', error.response?.status);
    console.log('Αιτία:', error.response?.data);
    console.log('URL Αρχικού Αιτήματος:', originalRequest?.url);
    console.log('Authorization header:', originalRequest?.headers?.Authorization || originalRequest?.headers?.authorization);

    // Handle rate limiting (429 errors) with exponential backoff
    if (error.response?.status === 429 && !originalRequest._rateLimitRetry) {
      console.warn('[INTERCEPTOR] Rate limit detected (429). Applying delay before retry...');
      originalRequest._rateLimitRetry = true;
      
      // Get retry-after header or use default delay (2 seconds)
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2000; // Convert to milliseconds
      
      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000))); // Max 10 seconds
      
      console.log(`[INTERCEPTOR] Retrying after ${delay}ms delay...`);
      return api(originalRequest);
    }

    console.log('[INTERCEPTOR] Replaying original request with new token:', {
      url: originalRequest.url,
      headers: originalRequest.headers,
    });

    if (shouldAttemptTokenRefresh(error, originalRequest)) {
      console.log('[INTERCEPTOR] Προϋποθέσεις για token refresh πληρούνται.');

      if (isRefreshing) {
        console.log('[INTERCEPTOR] Ήδη γίνεται refresh από άλλο αίτημα — προσθήκη σε ουρά.');
        return queueRequestWhileRefreshing(originalRequest);
      }

      console.log('[INTERCEPTOR] Ξεκινά νέα ανανέωση token...');
      return await handleTokenRefresh(originalRequest, error);
    }

    try {
      const method = (originalRequest?.method || '').toUpperCase();
      const cfg: any = originalRequest || {};
      const suppressToastValue = cfg.xToastSuppress as boolean | undefined;
      const suppressToastHeader = originalRequest?.headers?.['X-Toast-Suppress'] as string | undefined;
      const suppressToast = typeof suppressToastValue === 'boolean' ? suppressToastValue : (suppressToastHeader === 'true');
      const errorHeader = (cfg.xToastError as string | undefined) ?? (originalRequest?.headers?.['X-Toast-Error'] as string | undefined);
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      if (isMutation && !suppressToast) {
        const status = error.response?.status;
        const detail = (error.response?.data as any)?.detail || (error.response?.data as any)?.message;
        const defaultMsg = status ? `Σφάλμα (${status})` : 'Σφάλμα ενέργειας';
        const title = errorHeader && errorHeader.length > 0 ? errorHeader : defaultMsg;
        const description = typeof detail === 'string' ? detail : undefined;
        toast({ title, description, variant: 'destructive' as any });
      }
    } catch {}
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
): Promise<{ access: string; refresh: string; user: User; redirectPath?: string; tenantUrl?: string }> {
  console.log(`[API CALL] Attempting login for user: ${email}`);
  const { data } = await api.post('/api/users/login/', { email, password });

  if (typeof window !== 'undefined') {
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    console.log('[loginUser] Tokens saved to localStorage:', {
      access: data.access ? `...${data.access.slice(-10)}` : 'NO ACCESS TOKEN RETURNED',
      refresh: data.refresh ? `...${data.refresh.slice(-10)}` : 'NO REFRESH TOKEN RETURNED',
    });
  }

  // Get user data using the access token
  const userData = await getCurrentUser();
  const redirectPath = (data && (data.redirect_path as string | undefined)) || undefined;
  const tenantUrl = (data && (data.tenant_url as string | undefined)) || undefined;
  
  return {
    access: data.access,
    refresh: data.refresh,
    user: userData,
    redirectPath,
    tenantUrl,
  };
}


export async function logoutUser(): Promise<void> {
  console.log('[API CALL] Attempting logout.');
  const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh') : null;
  
  if (refresh) {
    try {
      await axios.post(`${API_BASE_URL}/api/users/logout/`, { refresh }, {
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
      const { data } = await api.get<User>('/api/users/me/');
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

export type Announcement = { 
  id: number; title: string; description: string; file: string | null; 
  start_date: string | null; end_date: string | null; is_active: boolean; building: number; // Building ID
  building_name?: string; // Building name
  published?: boolean; // Add missing published property
  is_currently_active?: boolean; days_remaining?: number | null; status_display?: string;
  created_at: string; updated_at?: string;
};

export type Vote = { 
  id: number; title: string; description: string; start_date: string; end_date: string; 
  building: number; // Building ID
  building_name?: string; // Building name
  choices?: string[]; is_active?: boolean; created_at?: string; updated_at?: string;
  status_display?: string; creator_name?: string; is_urgent?: boolean;
  total_votes?: number; // Total number of votes cast
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

export interface ServicePackagesResponse {
  results: ServicePackage[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Define the Building type
export type Building = {
  id: number;
  name: string;
  address: string;
  city: string; // Make city required to fix undefined errors
  postal_code?: string;
  apartments_count?: number;
  // 🔥 Heating system fields
  heating_system?: string;
  heating_fixed_percentage?: number;
  internal_manager_name?: string;
  internal_manager_phone?: string;
  management_office_name?: string;
  management_office_phone?: string;
  management_office_address?: string;
  management_fee_per_apartment?: number;
  reserve_contribution_per_apartment?: number;
  // Add missing reserve fund properties
  reserve_fund_goal?: number;
  reserve_fund_duration_months?: number;
  reserve_fund_priority?: 'after_obligations' | 'always';
  // 📅 Financial System Start Date
  financial_system_start_date?: string; // Ημερομηνία έναρξης του οικονομικού συστήματος
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
  console.log(`[API CALL] Attempting to fetch /api/buildings/ with page=${page}, pageSize=${pageSize}`);
  console.log('[API CALL] Current API base URL:', API_BASE_URL);
  try {
    // Use public endpoint for listing buildings since tenant may not have data
    const resp = await makeRequestWithRetry({
      method: 'get',
      url: '/api/buildings/public/',
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

// Backward compatibility function with retry logic
// In-memory cache for buildings
let buildingsCache: { data: Building[], timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchAllBuildings(): Promise<Building[]> {
  const cacheKey = getCacheKey('/api/buildings/public/', { page_size: 1000, page: 1 });
  
  // Check global throttling cache first
  const cached = getCachedOrInFlight(cacheKey);
  if (cached) {
    return await cached;
  }

  // Check if we should throttle this request
  if (shouldThrottleRequest(cacheKey)) {
    console.log('[API THROTTLE] Request throttled, returning cached data');
    const cachedData = API_CALL_CACHE.get(cacheKey);
    if (cachedData) return cachedData.data;
  }

  // Check local cache first (backward compatibility)
  if (buildingsCache && (Date.now() - buildingsCache.timestamp) < CACHE_DURATION) {
    console.log('[API CALL] Returning cached buildings');
    return buildingsCache.data;
  }

  console.log('[API CALL] Fetching all buildings (no pagination)');
  
  // Create promise and store in cache to prevent duplicate calls
  const fetchPromise = (async () => {
    try {
    // Try to disable pagination by requesting a very large page size
    const resp = await makeRequestWithRetry({
      method: 'get',
      url: '/api/buildings/public/',
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
      const totalCount = data.count || 0;
      
      while (nextUrl && allBuildings.length < totalCount && allBuildings.length < 1000) {
        console.log('[API CALL] Fetching next page:', nextUrl);
        const nextResp = await makeRequestWithRetry({
          method: 'get',
          url: nextUrl
        });
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
      // Cache the result
      buildingsCache = { data: allBuildings, timestamp: Date.now() };
      // Also cache in global throttling cache
      API_CALL_CACHE.set(cacheKey, { data: allBuildings, timestamp: Date.now() });
      return allBuildings;
    }
    
    // Cache the result
    buildingsCache = { data: buildings, timestamp: Date.now() };
    // Also cache in global throttling cache
    API_CALL_CACHE.set(cacheKey, { data: buildings, timestamp: Date.now() });
    return buildings;
    } catch (error) {
      // Remove the promise from cache on error
      API_CALL_CACHE.delete(cacheKey);
      console.error('[API CALL] Error fetching all buildings:', error);
      throw error;
    }
  })();

  // Store the promise in cache to prevent duplicate calls
  API_CALL_CACHE.set(cacheKey, { data: null, timestamp: Date.now(), promise: fetchPromise });
  
  return await fetchPromise;
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
    
    // Fallback: Return static building data for kiosk mode
    console.log('[API CALL] Using fallback static building data');
    const fallbackBuildings: Building[] = [
      {
        id: 3,
        name: "Σόλωνος 8, Αθήνα 106 73",
        address: "Σόλωνος 8, Αθήνα 106 73, Ελλάδα",
        city: "Αθήνα",
        postal_code: "10673",
        apartments_count: 12,
        internal_manager_name: "Νίκος Δημητρίου",
        internal_manager_phone: "2103456789",
        management_office_name: "Compuyterme",
        management_office_phone: "21055566368",
        management_office_address: "Αθήνα, Ελλάδα",
        latitude: 37.9838,
        longitude: 23.7275,
        street_view_image: undefined,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      },
      {
        id: 1,
        name: "Πατησίων 123",
        address: "Πατησίων 123, Αθήνα, Ελλάδα",
        city: "Αθήνα",
        postal_code: "10434",
        apartments_count: 8,
        internal_manager_name: "Μαρία Παπαδοπούλου",
        internal_manager_phone: "2101234567",
        management_office_name: "Compuyterme",
        management_office_phone: "21055566368",
        management_office_address: "Αθήνα, Ελλάδα",
        latitude: 37.9838,
        longitude: 23.7275,
        street_view_image: undefined,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      },
      {
        id: 2,
        name: "Κηφισίας 456",
        address: "Κηφισίας 456, Αθήνα, Ελλάδα",
        city: "Αθήνα",
        postal_code: "11525",
        apartments_count: 15,
        internal_manager_name: "Γιώργος Κωνσταντίνου",
        internal_manager_phone: "2109876543",
        management_office_name: "Compuyterme",
        management_office_phone: "21055566368",
        management_office_address: "Αθήνα, Ελλάδα",
        latitude: 37.9838,
        longitude: 23.7275,
        street_view_image: undefined,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      }
    ];
    
    return fallbackBuildings;
  }
}

export async function fetchBuilding(id: number): Promise<Building> {
  console.log(`[API CALL] Attempting to fetch /api/buildings/list/${id}/`);
  const { data } = await makeRequestWithRetry({
    method: 'get',
    url: `/api/buildings/list/${id}/`
  });
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
      url: '/buildings/list/',
      method: 'POST',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access')}`
      }
    };
    console.log('[API CALL] Request config:', config);
    console.log('[API CALL] Request data stringified:', JSON.stringify(payload));
    
    const { data } = await api.post<Building>('/api/buildings/list/', payload);
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
  const { data } = await api.put<Building>(`/api/buildings/list/${id}/`, payload, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
  return data;
}

export async function deleteBuilding(id: number): Promise<void> {
  console.log(`[API CALL] Attempting to delete building ${id}`);
  try {
    await api.delete(`/api/buildings/list/${id}/`);
    console.log(`[API] Successfully deleted building ${id}`);
  } catch (error) {
    console.error(`[API] Error deleting building ${id}:`, error);
    throw error;
  }
}

export async function fetchAnnouncements(buildingId?: number | null): Promise<Announcement[]> {
  // When buildingId is null, fetch from all buildings (no filter)
  const relativeUrl = buildingId ? `/api/announcements/?building=${buildingId}` : '/api/announcements/';
  
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
    // @ts-expect-error - AxiosError type is not guaranteed; narrowing via runtime checks
    if (error?.isAxiosError && error?.config) {
        // @ts-expect-error - Accessing axios-specific error.config fields for debug logging
        console.error('[DEBUG fetchAnnouncements] Failed Request Config:', JSON.stringify({url: error.config.url, baseURL: error.config.baseURL, method: error.config.method, params: error.config.params }, null, 2));
    }
    throw error;
  }
}

export async function fetchAnnouncement(id: string | number): Promise<Announcement> {
  console.log(`[API CALL] Attempting to fetch announcement with ID: ${id}`);
  
  try {
    const { data } = await api.get(`/api/announcements/${id}/`);
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
    const { data } = await api.delete<{ message: string }>(`/api/announcements/${announcementId}/`);
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
    const { data } = await api.post<Announcement>('/api/announcements/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } else {
    const jsonData: any = { ...payload };
    if (payload.file === null || payload.file === undefined) delete jsonData.file;
    // Set building to null for global announcements
    jsonData.building = buildingValue;
    const { data } = await api.post<Announcement>('/api/announcements/', jsonData);
    return data;
  }
}

export async function fetchVotes(buildingId?: number | null): Promise<Vote[]> {
  const url = buildingId ? `/api/votes/?building=${buildingId}` : '/api/votes/';
  console.log(`[API CALL] Attempting to fetch ${url}`);
  const resp: AxiosResponse<{ results?: Vote[] } | Vote[]> = await api.get(url);
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchMyVote(voteId: number): Promise<VoteSubmission | null> {
  console.log(`[API CALL] Attempting to fetch my submission for vote ${voteId}`);
  try {
    const { data } = await api.get<VoteSubmission>(`/api/votes/${voteId}/my-submission/`);
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
  const { data } = await api.post<VoteSubmission>(`/api/votes/${voteId}/vote/`, { choice });
  return data;
}

export async function fetchVoteResults(voteId: number): Promise<VoteResultsData> {
  console.log(`[API CALL] Attempting to fetch results for vote ${voteId}`);
  const { data } = await api.get<VoteResultsData>(`/api/votes/${voteId}/results/`);
  return data;
}

export async function deleteVote(voteId: number): Promise<string> {
  try {
    const { data } = await api.delete<{ message: string }>(`/api/votes/${voteId}/`);
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
  
  const { data } = await api.post<Vote>('/api/votes/', { 
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
  financial_info?: {
    total_payments: number;
    pending_payments: number;
    overdue_payments: number;
    total_collected: number;
    collection_rate: number;
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
  const { data } = await apiPublic.get(`/api/public-info/${buildingId}/`);
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
  const url = `/api/user-requests/${queryString ? '?' + queryString : ''}`;
  
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
    location: r.location,
    apartment_number: r.apartment_number,
    cost_estimate: r.cost_estimate,
    actual_cost: r.actual_cost,
    contractor_notes: r.contractor_notes,
  }));
}

export async function fetchTopRequests(buildingId: number | null): Promise<UserRequest[]> {
  const url = buildingId ? `/api/user-requests/top/?building=${buildingId}` : '/api/user-requests/top/?building=null';
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
    location: r.location,
    apartment_number: r.apartment_number,
    cost_estimate: r.cost_estimate,
    actual_cost: r.actual_cost,
    contractor_notes: r.contractor_notes,
  }));
}

export async function fetchUserRequestsForBuilding(buildingId: number): Promise<UserRequest[]> {
  const url = `/api/user-requests/?building=${buildingId}`;
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
    const { data } = await api.post(`/api/user-requests/${id}/support/`);
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
  for (const [key, value] of formData.entries()) {
    console.log(`[API CALL] ${key}:`, value);
  }
  
  const { data } = await api.post<UserRequest>('/api/user-requests/', formData, {
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
  const { data } = await api.patch<UserRequest>(`/api/user-requests/${id}/`, payload);
  return data;
}

export async function deleteUserRequest(requestId: number): Promise<void> {
  try {
    await api.delete(`/api/user-requests/${requestId}/`);
    console.log(`[API] Successfully deleted user request ${requestId}`);
  } catch (error) {
    console.error(`[API] Error deleting user request ${requestId}:`, error);
    throw error;
  }
}

export async function fetchObligationsSummary(): Promise<ObligationSummary> {
  console.log('[API CALL] Attempting to fetch /api/obligations/summary/');
  const { data } = await api.get<ObligationSummary>('/api/obligations/summary/');
  return data;
}

export async function fetchObligations(filters: { buildingId?: number, status?: string } = {}): Promise<Obligation[]> {
  const params = new URLSearchParams();
  if (filters.buildingId) params.append('building', String(filters.buildingId));
  if (filters.status) params.append('status', filters.status);
  const queryString = params.toString();
  const url = `/api/obligations/${queryString ? '?' + queryString : ''}`;
  console.log(`[API CALL] Attempting to fetch ${url}`);
  const resp: AxiosResponse<{ results?: Obligation[] } | Obligation[]> = await api.get(url);
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchObligation(id: number): Promise<Obligation> {
  console.log(`[API CALL] Attempting to fetch /api/obligations/${id}/`);
  const { data } = await api.get<Obligation>(`/api/obligations/${id}/`);
  return data;
}

export async function createObligation(payload: Omit<Obligation, 'id' | 'created_at' | 'updated_at'>): Promise<Obligation> {
  console.log('[API CALL] Attempting to create obligation:', payload);
  const { data } = await api.post<Obligation>('/api/obligations/', payload);
  return data;
}

export async function updateObligation(id: number, payload: Partial<Omit<Obligation, 'id' | 'created_at' | 'updated_at'>>): Promise<Obligation> {
  console.log(`[API CALL] Attempting to update obligation ${id}:`, payload);
  const { data } = await api.put<Obligation>(`/api/obligations/${id}/`, payload);
  return data;
}

export async function deleteObligation(id: number): Promise<void> {
  console.log(`[API CALL] Attempting to delete obligation ${id}`);
  await api.delete(`/api/obligations/${id}/`);
}

// Νέα συνάρτηση για την ανάκτηση των κατοίκων ενός κτιρίου
export async function fetchResidents(buildingId: number | null) {
  const url = buildingId ? `/api/residents/?building=${buildingId}` : '/api/residents/';
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
  const response = await api.post('/api/residents/create-with-user/', payload);
  console.log('[createResident] Response:', response.data);
  return response.data.resident;
}

export async function deleteResident(id: number): Promise<void> {
  await api.delete(`/api/residents/${id}/remove/`);
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
  status_display: string;
  is_rented: boolean;
  is_closed: boolean;
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
  participation_mills?: number;
  heating_mills?: number;
  elevator_mills?: number;
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
  
  const { data } = await makeRequestWithRetry({
    method: 'get',
    url: `/api/apartments/?${params.toString()}`
  });
  return data;
}

// Λήψη συγκεκριμένου διαμερίσματος
export async function fetchApartment(id: number): Promise<Apartment> {
  console.log('[API CALL] Attempting to fetch apartment:', id);
  const { data } = await api.get<Apartment>(`/api/apartments/${id}/`);
  return data;
}

// Λήψη όλων των διαμερισμάτων ενός κτιρίου
export async function fetchBuildingApartments(buildingId: number): Promise<BuildingApartmentsResponse> {
  console.log('[API CALL] Attempting to fetch building apartments:', buildingId);
  const { data } = await api.get<BuildingApartmentsResponse>(`/api/apartments/by-building/${buildingId}/`);
  return data;
}

// Λήψη διαμερισμάτων με οικονομικά δεδομένα σε μια κλήση (optimized for rate limiting)
export async function fetchApartmentsWithFinancialData(buildingId: number, month?: string): Promise<any[]> {
  console.log('[API CALL] Attempting to fetch apartments with financial data:', buildingId, 'month:', month);
  
  try {
    // Use the apartment_balances endpoint which has expense_share data
    const params = new URLSearchParams();
    params.append('building_id', buildingId.toString());
    if (month) {
      params.append('month', month);
    }
    const queryString = params.toString();
    const url = `/api/financial/dashboard/apartment_balances/?${queryString}`;
    
    const { data } = await makeRequestWithRetry({
      method: 'get',
      url
    });
    
    console.log('[API CALL] Successfully fetched apartments with financial data:', {
      dataType: typeof data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'N/A',
      sampleData: Array.isArray(data) && data.length > 0 ? data[0] : 'No data'
    });
    
    const result = data.apartments || data || [];
    console.log('[API CALL] Processed result:', {
      resultType: typeof result,
      isArray: Array.isArray(result),
      length: Array.isArray(result) ? result.length : 'N/A',
      sampleResult: Array.isArray(result) && result.length > 0 ? result[0] : 'No data'
    });
    
    return result;
  } catch (error: any) {
    // If the optimized endpoint doesn't exist, fall back to individual calls with throttling
    console.warn('Batch endpoint not available, using fallback with throttling');
    return await fetchApartmentsWithFinancialDataFallback(buildingId);
  }
}

// Fallback method with throttling to prevent rate limiting
async function fetchApartmentsWithFinancialDataFallback(buildingId: number): Promise<any[]> {
  console.log('[API CALL] Using fallback method with throttling for building:', buildingId);
  
  // First get building data and apartments
  const [buildingResponse, apartmentsResponse] = await Promise.all([
    makeRequestWithRetry({ method: 'get', url: `/api/buildings/list/${buildingId}/` }),
    makeRequestWithRetry({ method: 'get', url: `/api/apartments/?building=${buildingId}` })
  ]);
  
  const allApartments = apartmentsResponse.data.results || apartmentsResponse.data;
  
  // Throttle the financial data requests to prevent rate limiting
  const apartmentsWithFinancialData = [];
  const BATCH_SIZE = 3; // Process 3 apartments at a time
  const DELAY_BETWEEN_BATCHES = 500; // 500ms delay between batches
  
  for (let i = 0; i < allApartments.length; i += BATCH_SIZE) {
    const batch = allApartments.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (apartment: any) => {
      try {
        const paymentsResponse = await makeRequestWithRetry({
          method: 'get',
          url: `/api/financial/payments/?building_id=${buildingId}&apartment=${apartment.id}`
        });
        
        const payments = paymentsResponse.data.results || paymentsResponse.data || [];
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
    
    // Add delay between batches to prevent rate limiting
    if (i + BATCH_SIZE < allApartments.length) {
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }
  
  return apartmentsWithFinancialData;
}

// Δημιουργία διαμερίσματος
export async function createApartment(payload: CreateApartmentPayload): Promise<Apartment> {
  console.log('[API CALL] Attempting to create apartment:', payload);
  const { data } = await api.post<Apartment>('/api/apartments/', payload);
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
  const { data } = await api.get(`/api/apartments/residents/${buildingId}/`);
  return data;
}

// Λήψη λίστας ενοίκων για επιλογή διαχειριστή
export async function fetchBuildingResidents(buildingId: number): Promise<{
  residents: Array<{
    id: string;
    apartment_id: number;
    apartment_number: string;
    name: string;
    phone: string;
    email: string;
    type: 'owner' | 'tenant';
    display_text: string;
  }>;
  total_residents: number;
}> {
  console.log('[API CALL] Attempting to fetch building residents for manager selection:', buildingId);
  const { data } = await api.get(`/api/apartments/building-residents/${buildingId}/`);
  return data;
}

// Ενημέρωση email ενοικιαστή/ιδιοκτήτη
export async function updateResidentEmail(
  apartmentId: number, 
  type: 'owner' | 'tenant', 
  email: string
): Promise<{ message: string; apartment_id: number; email: string }> {
  console.log('[API CALL] Attempting to update resident email:', { apartmentId, type, email });
  const { data } = await api.post(`/api/apartments/${apartmentId}/update-email/`, {
    type,
    email
  });
  return data;
}

// Μαζική δημιουργία διαμερισμάτων
export async function bulkCreateApartments(payload: BulkCreateApartmentsPayload): Promise<{ message: string; created_count: number; apartments: ApartmentList[] }> {
  console.log('[API CALL] Attempting to bulk create apartments:', payload);
  const { data } = await api.post('/api/apartments/bulk-create/', payload);
  return data;
}

// Ενημέρωση διαμερίσματος
export async function updateApartment(id: number, payload: Partial<CreateApartmentPayload>): Promise<Apartment> {
  console.log('[API CALL] Attempting to update apartment:', id, payload);
  const { data } = await api.patch<Apartment>(`/api/apartments/${id}/`, payload);
  return data;
}

// Ενημέρωση στοιχείων ιδιοκτήτη
export async function updateApartmentOwner(id: number, payload: UpdateOwnerPayload): Promise<{ message: string; apartment: Apartment }> {
  console.log('[API CALL] Attempting to update apartment owner:', id, payload);
  const { data } = await api.post(`/api/apartments/${id}/update-owner/`, payload);
  return data;
}

// Ενημέρωση στοιχείων ενοίκου
export async function updateApartmentTenant(id: number, payload: UpdateTenantPayload): Promise<{ message: string; apartment: Apartment }> {
  console.log('[API CALL] Attempting to update apartment tenant:', id, payload);
  const { data } = await api.post(`/api/apartments/${id}/update-tenant/`, payload);
  return data;
}

// Διαγραφή διαμερίσματος
export async function deleteApartment(id: number): Promise<{ message: string }> {
  console.log('[API CALL] Attempting to delete apartment:', id);
  const { data } = await api.delete(`/api/apartments/${id}/`);
  return data;
}

// Στατιστικά διαμερισμάτων
export async function fetchApartmentStatistics(buildingId?: number): Promise<ApartmentStatistics> {
  console.log('[API CALL] Attempting to fetch apartment statistics:', buildingId);
  
  const params = buildingId ? `?building=${buildingId}` : '';
  const { data } = await api.get<ApartmentStatistics>(`/api/apartments/statistics/${params}`);
  return data;
}

// Service Packages API
export async function fetchServicePackages(buildingId?: number): Promise<ServicePackage[]> {
  console.log('[API CALL] Fetching service packages');
  try {
    const params = new URLSearchParams();
    if (buildingId) {
      params.append('building_id', buildingId.toString());
    }
    
    const resp = await api.get<ServicePackagesResponse>(`/api/buildings/service-packages/?${params}`);
    console.log('[API CALL] Service packages response:', resp.data);
    
    // Επιστρέφει το results array από το paginated response
    return resp.data.results || [];
  } catch (error) {
    console.error('[API CALL] Error fetching service packages:', error);
    throw error;
  }
}

export async function createServicePackage(packageData: Partial<ServicePackage>): Promise<ServicePackage> {
  console.log('[API CALL] Creating service package:', packageData);
  try {
    const resp = await api.post<ServicePackage>('/api/buildings/service-packages/', packageData);
    console.log('[API CALL] Create service package response:', resp.data);
    return resp.data;
  } catch (error) {
    console.error('[API CALL] Error creating service package:', error);
    throw error;
  }
}

export async function updateServicePackage(packageId: number, packageData: Partial<ServicePackage>): Promise<ServicePackage> {
  console.log(`[API CALL] Updating service package ${packageId}:`, packageData);
  try {
    const resp = await api.patch<ServicePackage>(`/api/buildings/service-packages/${packageId}/`, packageData);
    console.log('[API CALL] Update service package response:', resp.data);
    return resp.data;
  } catch (error) {
    console.error('[API CALL] Error updating service package:', error);
    throw error;
  }
}

export async function deleteServicePackage(packageId: number): Promise<void> {
  console.log(`[API CALL] Deleting service package ${packageId}`);
  try {
    await api.delete(`/api/buildings/service-packages/${packageId}/`);
    console.log('[API CALL] Service package deleted successfully');
  } catch (error) {
    console.error('[API CALL] Error deleting service package:', error);
    throw error;
  }
}

export async function applyServicePackageToBuilding(packageId: number, buildingId: number): Promise<any> {
  console.log(`[API CALL] Applying service package ${packageId} to building ${buildingId}`);
  try {
    const resp = await api.post(`/api/buildings/service-packages/${packageId}/apply_to_building/`, {
      building_id: buildingId
    });
    console.log('[API CALL] Apply service package response:', resp.data);
    return resp.data;
  } catch (error) {
    console.error('[API CALL] Error applying service package:', error);
    throw error;
  }
}

// Removed problematic dynamic import that was causing ChunkLoadError
// Dynamic imports of Next.js navigation should only happen within React components

// ============================================================================
// 👥 TEAMS API FUNCTIONS
// ============================================================================

export type Team = {
  id: number;
  name: string;
  team_type: string;
  description: string;
  status: string;
  member_count: number;
  max_members: number;
  is_full: boolean;
  leader_name: string;
  building: number;
  created_at: string;
};

export type TeamMember = {
  id: number;
  user_name: string;
  user_email: string;
  role_name: string;
  status: string;
  joined_at: string;
  team: number;
};

export type TeamTask = {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string;
  assigned_to_name: string;
  team: number;
};

export async function fetchTeams(buildingId?: number): Promise<Team[]> {
  const params = new URLSearchParams();
  if (buildingId) params.append('building', buildingId.toString());
  
  const response = await api.get(`/api/teams/teams/?${params.toString()}`);
  return response.data.results || response.data;
}

export async function fetchTeamMembers(buildingId?: number): Promise<TeamMember[]> {
  const params = new URLSearchParams();
  if (buildingId) params.append('building', buildingId.toString());
  
  const response = await api.get(`/api/teams/members/?${params.toString()}`);
  return response.data.results || response.data;
}

export async function fetchTeamTasks(buildingId?: number): Promise<TeamTask[]> {
  const params = new URLSearchParams();
  if (buildingId) params.append('building', buildingId.toString());
  
  const response = await api.get(`/api/teams/tasks/?${params.toString()}`);
  return response.data.results || response.data;
}

// ============================================================================
// 🤝 COLLABORATORS API FUNCTIONS
// ============================================================================

export type Collaborator = {
  id: number;
  name: string;
  collaborator_type: string;
  contact_person: string;
  phone: string;
  email: string;
  rating: number;
  hourly_rate: number;
  availability: string;
  status: string;
  created_at: string;
};

export type CollaborationProject = {
  id: number;
  title: string;
  project_type: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  actual_cost: number;
  progress_percentage: number;
  building: number;
  collaborator: number;
  collaborator_name?: string; // Add missing property
  created_at: string;
};

export type CollaborationContract = {
  id: number;
  contract_number: string;
  title: string;
  contract_type: string;
  status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  total_value?: number; // Add missing property
  is_active?: boolean; // Add missing property
  collaborator_name?: string; // Add missing property
  building: number;
  collaborator: number;
  created_at: string;
};

export type CollaborationInvoice = {
  id: number;
  invoice_number: string;
  description: string;
  amount: number;
  total_amount?: number; // Add missing property
  status: string;
  issue_date: string;
  due_date: string;
  collaborator: number;
  collaborator_name?: string; // Add missing property
  contract: number;
  contract_number?: string; // Add missing property
  created_at: string;
};

export async function fetchCollaborators(): Promise<Collaborator[]> {
  const response = await api.get('/api/collaborators/collaborators/');
  return response.data.results || response.data;
}

export async function fetchCollaborationProjects(buildingId?: number): Promise<CollaborationProject[]> {
  const params = new URLSearchParams();
  if (buildingId) params.append('building', buildingId.toString());
  
  const response = await api.get(`/api/collaborators/projects/?${params.toString()}`);
  return response.data.results || response.data;
}

export async function fetchCollaborationContracts(buildingId?: number): Promise<CollaborationContract[]> {
  const params = new URLSearchParams();
  if (buildingId) params.append('building', buildingId.toString());
  
  const response = await api.get(`/api/collaborators/contracts/?${params.toString()}`);
  return response.data.results || response.data;
}

export async function fetchCollaborationInvoices(): Promise<CollaborationInvoice[]> {
  const response = await api.get('/api/collaborators/invoices/');
  return response.data.results || response.data;
}

// ============================================================================
// 🏢 SUPPLIERS & CONTRACTORS API FUNCTIONS
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
  const params = new URLSearchParams();
  if (buildingId) params.append('building', buildingId.toString());
  
  const response = await api.get(`/api/financial/suppliers/?${params.toString()}`);
  return response.data.results || response.data;
}

export async function fetchContractors(): Promise<Contractor[]> {
  const response = await api.get('/api/maintenance/contractors/');
  return response.data.results || response.data;
}

export async function createContractor(
  payload: Partial<Omit<Contractor, 'id' | 'created_at'>>
): Promise<Contractor> {
  const { data } = await api.post<Contractor>('/api/maintenance/contractors/', payload);
  return data;
}

export async function updateContractor(
  id: number,
  payload: Partial<Omit<Contractor, 'id' | 'created_at'>>
): Promise<Contractor> {
  const { data } = await api.patch<Contractor>(`/api/maintenance/contractors/${id}/`, payload);
  return data;
}

export async function deleteContractor(id: number): Promise<void> {
  await api.delete(`/api/maintenance/contractors/${id}/`);
}

export async function fetchContractor(id: number): Promise<Contractor> {
  const { data } = await api.get<Contractor>(`/api/maintenance/contractors/${id}/`);
  return data;
}

// ============================================================================
// 🛠️ MAINTENANCE: TICKETS & WORK ORDERS API FUNCTIONS
// ============================================================================

export type MaintenanceTicket = {
  id: number;
  building: number;
  apartment?: number | null;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  reporter?: number | null;
  assignee?: number | null;
  contractor?: number | null;
  sla_due_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkOrder = {
  id: number;
  ticket: number;
  contractor?: number | null;
  assigned_to?: number | null;
  status: string;
  scheduled_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
};

export async function fetchMaintenanceTickets(filters: { building?: number; search?: string; status?: string; ordering?: string } = {}): Promise<MaintenanceTicket[]> {
  const params = new URLSearchParams();
  if (filters.building) params.append('building', String(filters.building));
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.ordering) params.append('ordering', filters.ordering);
  const url = `/api/maintenance/tickets/${params.toString() ? `?${params.toString()}` : ''}`;
  const resp = await api.get(url);
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchMaintenanceTicket(id: number): Promise<MaintenanceTicket> {
  const { data } = await api.get(`/api/maintenance/tickets/${id}/`);
  return data;
}

export async function fetchWorkOrders(filters: { ticket?: number; building?: number; status?: string; ordering?: string } = {}): Promise<WorkOrder[]> {
  const params = new URLSearchParams();
  if (filters.ticket) params.append('ticket', String(filters.ticket));
  if (filters.building) params.append('building', String(filters.building));
  if (filters.status) params.append('status', filters.status);
  if (filters.ordering) params.append('ordering', filters.ordering);
  const url = `/api/maintenance/work-orders/${params.toString() ? `?${params.toString()}` : ''}`;
  const resp = await api.get(url);
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchWorkOrder(id: number): Promise<WorkOrder> {
  const { data } = await api.get(`/api/maintenance/work-orders/${id}/`);
  return data;
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
  const search = new URLSearchParams();
  if (params.buildingId) search.append('building', String(params.buildingId));
  const url = `/api/maintenance/receipts/${search.toString() ? `?${search.toString()}` : ''}`;
  const resp = await api.get(url);
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function updateServiceReceipt(
  id: number,
  payload: Partial<Omit<ServiceReceipt, 'id' | 'created_at'>>
): Promise<ServiceReceipt> {
  const { data } = await api.patch<ServiceReceipt>(`/api/maintenance/receipts/${id}/`, payload);
  return data;
}

export async function deleteServiceReceipt(id: number): Promise<void> {
  await api.delete(`/api/maintenance/receipts/${id}/`, { xToastSuppress: true } as any);
}

export async function fetchServiceReceipt(id: number): Promise<ServiceReceipt> {
  const { data } = await api.get<ServiceReceipt>(`/api/maintenance/receipts/${id}/`);
  return data;
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
  const { data } = await api.post<ServiceReceipt>('/api/maintenance/receipts/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

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
  const search = new URLSearchParams();
  if (params.buildingId) search.append('building', String(params.buildingId));
  if (params.priority) search.append('priority', params.priority);
  if (params.ordering) search.append('ordering', params.ordering);
  const url = `/api/maintenance/scheduled/${search.toString() ? `?${search.toString()}` : ''}`;
  const resp = await api.get(url);
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchScheduledMaintenance(id: number): Promise<ScheduledMaintenance> {
  const { data } = await api.get(`/api/maintenance/scheduled/${id}/`);
  return data;
}

export async function createScheduledMaintenance(payload: Omit<ScheduledMaintenance, 'id'>): Promise<ScheduledMaintenance> {
  const { data } = await api.post<ScheduledMaintenance>('/api/maintenance/scheduled/', payload);
  return data;
}

export async function updateScheduledMaintenance(
  id: number,
  payload: Partial<Omit<ScheduledMaintenance, 'id'>>
): Promise<ScheduledMaintenance> {
  const { data } = await api.patch<ScheduledMaintenance>(`/api/maintenance/scheduled/${id}/`, payload, { xToastSuppress: true } as any);
  return data;
}

export async function deleteScheduledMaintenance(id: number): Promise<void> {
  await api.delete(`/api/maintenance/scheduled/${id}/`, { xToastSuppress: true } as any);
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/api/projects/projects/${id}/`, { xToastSuppress: true } as any);
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
    const response = await axios.post(`${API_BASE_URL}/api/users/token/refresh/`, { refresh }, {
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });
    
    console.log('[handleTokenRefresh] Token refresh response:', response.data);
    
    const { data } = response;

    if (!data.access) {
      console.error('[handleTokenRefresh] Token refresh response did not include access token!', data);
      throw new Error('Token refresh failed: No access token in response');
    }

    console.log('[handleTokenRefresh] Token refresh successful, new token received');
    console.log('[handleTokenRefresh] New token (first 20 chars):', data.access.substring(0, 20) + '...');
    console.log('[handleTokenRefresh] New token length:', data.access.length);
    console.log('[handleTokenRefresh] New token type:', typeof data.access);
    
    // Check if token is a valid JWT format
    const tokenParts = data.access.split('.');
    console.log('[handleTokenRefresh] Token parts count:', tokenParts.length);
    if (tokenParts.length !== 3) {
      console.error('[handleTokenRefresh] Invalid JWT token format - should have 3 parts');
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('access', data.access);
      console.log('[handleTokenRefresh] New access token saved to localStorage');
      
      // Verify the token was saved correctly
      const savedToken = localStorage.getItem('access');
      console.log('[handleTokenRefresh] Verified saved token (first 20 chars):', savedToken?.substring(0, 20) + '...');
      
      // Verify token integrity
      if (savedToken !== data.access) {
        console.error('[handleTokenRefresh] Token corruption detected! Original and saved tokens do not match');
        console.error('[handleTokenRefresh] Original token length:', data.access.length);
        console.error('[handleTokenRefresh] Saved token length:', savedToken?.length);
      } else {
        console.log('[handleTokenRefresh] Token integrity verified - saved token matches original');
      }
    }

    // Αποθηκεύουμε το νέο token στο axios instance
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
    console.log('[handleTokenRefresh] Set Authorization header in api defaults');
    processQueue(null, data.access);

    // Ορίζουμε Authorization για το αρχικό αίτημα
    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers['Authorization'] = `Bearer ${data.access}`;
    
    // Επιπλέον έλεγχος: βεβαιωθείτε ότι το token είναι σωστά αποθηκευμένο
    console.log('[handleTokenRefresh] Final check - Token in localStorage:', localStorage.getItem('access')?.substring(0, 20) + '...');
    console.log('[handleTokenRefresh] Final check - Token in api defaults:', api.defaults.headers.common['Authorization']?.substring(0, 20) + '...');

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
    
    // Additional debugging for the Authorization header
    const authHeader = originalRequest.headers['Authorization'];
    console.log('[handleTokenRefresh] Authorization header being sent:', authHeader?.substring(0, 30) + '...');
    console.log('[handleTokenRefresh] Authorization header starts with "Bearer":', authHeader?.startsWith('Bearer '));

    // Επαναποστολή του αρχικού αιτήματος με το νέο token
    // Χρησιμοποιούμε το api instance που τώρα έχει το νέο token
    console.log('[handleTokenRefresh] About to retry original request with new token');
    
    // Small delay to ensure token is properly saved and applied
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return api(originalRequest);

  } catch (refreshError: any) {
    console.error('[handleTokenRefresh] Token refresh failed:', refreshError);
    console.error('[handleTokenRefresh] Error response:', refreshError.response?.data);
    console.error('[handleTokenRefresh] Error status:', refreshError.response?.status);
    
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
