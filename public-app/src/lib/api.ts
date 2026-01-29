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

// Global API call in-flight deduplication (NO data caching, only promise dedup)
// Each cache entry has a generation number to prevent race conditions
type CacheEntry = {
  promise: Promise<unknown>;
  generation: number;
};

const API_CALL_CACHE = new Map<string, CacheEntry>();
const MIN_REQUEST_INTERVAL = 1000; // 1 second minimum between identical requests (throttle only)

// Generation counter incremented on each invalidation to detect stale responses
let CACHE_GENERATION = 0;

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

/**
 * Check if there's an in-flight request and return its promise
 * Does NOT return cached data - only deduplicates concurrent requests
 */
function getInFlightRequest<T>(cacheKey: string): Promise<T> | null {
  const cached = API_CALL_CACHE.get(cacheKey);
  if (!cached) return null;

  // Only return in-flight promises, never cached data
  return cached.promise as Promise<T>;
}

/**
 * Invalidate API cache for paths matching a pattern
 * Used after mutations to ensure fresh data on next GET
 * Increments generation counter to prevent race conditions
 */
export function invalidateApiCache(pathPattern?: string | RegExp): void {
  // Increment generation to invalidate all in-flight requests
  CACHE_GENERATION++;

  if (!pathPattern) {
    // Clear all cache
    console.log(`[API CACHE] Clearing all cache (generation: ${CACHE_GENERATION})`);
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
    console.log(`[API CACHE] Cleared ${cleared} cache entries matching pattern: ${pathPattern} (generation: ${CACHE_GENERATION})`);
  }
}

const trimErrorBody = (body?: string) => {
  if (!body) return undefined;
  return body.length > MAX_ERROR_BODY_CHARS
    ? `${body.slice(0, MAX_ERROR_BODY_CHARS)}…`
    : body;
};

const extractErrorMessage = (body?: string): string | undefined => {
  if (!body) return undefined;
  const text = body.trim();
  if (!text) return undefined;

  const maybeJson = text.startsWith('{') || text.startsWith('[');
  if (!maybeJson) return trimErrorBody(text);

  try {
    const parsed: any = JSON.parse(text);

    // Some upstream proxies wrap a JSON string under `details`.
    const details = parsed?.details;
    if (typeof details === 'string' && details.trim()) {
      try {
        const inner: any = JSON.parse(details);
        const innerMessage =
          (typeof inner?.error === 'string' && inner.error) ||
          (typeof inner?.detail === 'string' && inner.detail) ||
          (typeof inner?.message === 'string' && inner.message);
        if (innerMessage) return trimErrorBody(innerMessage);
      } catch {
        return trimErrorBody(details.trim());
      }
    }

    const message =
      (typeof parsed?.error === 'string' && parsed.error) ||
      (typeof parsed?.detail === 'string' && parsed.detail) ||
      (typeof parsed?.message === 'string' && parsed.message);
    if (message) return trimErrorBody(message);

    if (Array.isArray(parsed?.non_field_errors) && typeof parsed.non_field_errors[0] === 'string') {
      return trimErrorBody(parsed.non_field_errors[0]);
    }

    // Fall back to the first string error in a field-error dict.
    if (parsed && typeof parsed === 'object') {
      for (const value of Object.values(parsed)) {
        if (typeof value === 'string' && value.trim()) return trimErrorBody(value.trim());
        if (Array.isArray(value) && typeof value[0] === 'string') return trimErrorBody(value[0]);
      }
    }
  } catch {
    // Ignore parse errors and fall back to raw text.
  }

  return trimErrorBody(text);
};

// Global flag to prevent multiple 401 error toasts from showing simultaneously
let hasShown401Error = false;
let last401ErrorTime = 0;
const ERROR_TOAST_COOLDOWN = 5000; // 5 seconds cooldown between 401 error toasts

// Global flag to prevent multiple token refresh attempts simultaneously
let isRefreshingToken = false;
let refreshTokenPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the access token using the refresh token
 * Returns the new access token or null if refresh failed
 */
async function refreshAccessToken(): Promise<string | null> {
  // If already refreshing, return the existing promise
  if (isRefreshingToken && refreshTokenPromise) {
    console.log('[API TOKEN REFRESH] Already refreshing, waiting for existing refresh...');
    return refreshTokenPromise;
  }

  if (typeof window === 'undefined') return null;

  const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refresh');
  if (!refreshToken) {
    console.log('[API TOKEN REFRESH] No refresh token found');
    return null;
  }

  isRefreshingToken = true;
  console.log('[API TOKEN REFRESH] Attempting to refresh access token...');

  refreshTokenPromise = (async () => {
    try {
      const response = await fetch('/api/users/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        console.log(`[API TOKEN REFRESH] Refresh failed with status: ${response.status}`);
        return null;
      }

      const data = await response.json() as { access: string; refresh?: string };
      const newAccessToken = data.access;

      // Store new access token
      localStorage.setItem('access_token', newAccessToken);
      localStorage.setItem('access', newAccessToken);

      // If a new refresh token was returned (rotation enabled), store it too
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('refresh', data.refresh);
      }

      console.log('[API TOKEN REFRESH] Token refreshed successfully');
      return newAccessToken;
    } catch (error) {
      console.error('[API TOKEN REFRESH] Error refreshing token:', error);
      return null;
    } finally {
      isRefreshingToken = false;
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
}

/**
 * Handle 401 Unauthorized errors with user-friendly message
 * Uses deduplication to prevent multiple toasts for concurrent requests
 */
function handle401Error(): void {
  // Only show toast in browser environment
  if (typeof window === 'undefined') return;

  const now = Date.now();

  // Check if we've shown a 401 error recently (within cooldown period)
  if (hasShown401Error && (now - last401ErrorTime) < ERROR_TOAST_COOLDOWN) {
    return;
  }

  // Dynamically import errorMessages to avoid circular dependencies
  // and to ensure it's only loaded in browser environment
  import('@/lib/errorMessages').then(({ showBuildingError }) => {
    showBuildingError('SESSION_EXPIRED');
    hasShown401Error = true;
    last401ErrorTime = now;

    // Reset flag after cooldown period
    setTimeout(() => {
      hasShown401Error = false;
    }, ERROR_TOAST_COOLDOWN);
  }).catch((err) => {
    // Fallback if errorMessages fails to load
    console.error('Failed to load errorMessages:', err);
  });
}

const createApiError = (
  method: string,
  url: string,
  status: number,
  body?: string,
): ApiError => {
  const trimmedBody = trimErrorBody(body);
  const extractedMessage = extractErrorMessage(body);
  const suffix = extractedMessage ? ` ${extractedMessage}` : trimmedBody ? ` ${trimmedBody}` : "";
  const error = new Error(
    `${method.toUpperCase()} ${url} failed: ${status}${suffix}`,
  ) as ApiError;
  error.status = status;
  error.response = { status, body: trimmedBody };

  // Handle 401 errors with user-friendly message
  if (status === 401) {
    handle401Error();
  }

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

    // ✅ Multi-tenant routing support when running on a shared public domain.
    // Prefer an explicit tenant host derived from:
    // 1) Ultra-admin override (platform tooling)
    // 2) Cached user tenant schema
    // This allows backend proxy routes to forward the correct tenant host to Django.
    try {
      const cached = localStorage.getItem("user");
      if (cached) {
        const parsed = JSON.parse(cached) as { tenant?: { schema_name?: string } | null; role?: string; is_superuser?: boolean; is_staff?: boolean };
        const isUltraAdmin =
          String(parsed?.role || "").toLowerCase() === "admin" && Boolean(parsed?.is_superuser) && Boolean(parsed?.is_staff);

        const override = localStorage.getItem("ultra_admin_tenant_host_override") || "";
        if (isUltraAdmin && override && typeof override === "string" && override.trim()) {
          headers["X-Tenant-Host"] = override.trim();
        } else {
          const schema = parsed?.tenant?.schema_name;
          if (schema && typeof schema === "string" && schema.trim()) {
            headers["X-Tenant-Host"] = `${schema}.newconcierge.app`;
          }
        }
      }
    } catch {
      // ignore parsing errors
    }

    // Fallback: if no tenant host was derived from user/override, use current hostname
    // (works for tenant subdomains like theo.newconcierge.app and demo.localhost)
    if (!headers["X-Tenant-Host"]) {
      const hostname = window.location.hostname || "";
      const shouldSet =
        (typeof hostname === "string" && hostname.endsWith("newconcierge.app")) ||
        (typeof hostname === "string" && hostname.endsWith("localhost"));
      if (shouldSet && hostname.trim()) {
        headers["X-Tenant-Host"] = hostname.trim();
      }
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
  skipTokenRefresh: boolean = false,
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

  // Check for in-flight request (deduplication only)
  const inFlight = getInFlightRequest<T>(cacheKey);
  if (inFlight) {
    console.log(`[API DEDUP] Returning in-flight request for ${cacheKey}`);
    return inFlight;
  }

  // Capture current generation at request start
  const requestGeneration = CACHE_GENERATION;

  // Create fetch promise
  const fetchPromise = (async () => {
    try {
      let res = await fetch(urlString, {
        method: "GET",
        headers: getHeaders('GET'),
        credentials: "include",
      });

      // Handle 401 with token refresh (only if not already retrying)
      if (res.status === 401 && !skipTokenRefresh) {
        console.log(`[API] Got 401 for ${urlString}, attempting token refresh...`);
        const newToken = await refreshAccessToken();

        if (newToken) {
          // Retry the request with the new token
          console.log(`[API] Retrying request with new token...`);
          res = await fetch(urlString, {
            method: "GET",
            headers: getHeaders('GET'), // This will pick up the new token from localStorage
            credentials: "include",
          });
        }
      }

      if (!res.ok) {
        resetRetryDelay(urlString);
        let errorText: string | undefined;
        try {
          errorText = await res.text();
        } catch {
          // ignore
        }
        throw createApiError("GET", urlString, res.status, errorText);
      }

      const data = attachApiResponseData(await res.json() as T);

      // Reset retry delay on success
      resetRetryDelay(urlString);

      // ✅ RACE CONDITION PROTECTION: Don't cache if generation changed (invalidation happened)
      if (requestGeneration === CACHE_GENERATION) {
        // Remove from cache after successful completion (no data caching)
        API_CALL_CACHE.delete(cacheKey);
      } else {
        console.log(`[API CACHE] Ignoring stale response for ${cacheKey} (gen ${requestGeneration} vs ${CACHE_GENERATION})`);
      }

      return data;
    } catch (error) {
      // Remove promise from cache on error
      API_CALL_CACHE.delete(cacheKey);
      throw error;
    }
  })();

  // Store promise in cache for in-flight deduplication only
  API_CALL_CACHE.set(cacheKey, {
    promise: fetchPromise,
    generation: requestGeneration,
  });

  return fetchPromise;
}

/**
 * GET request helper for binary responses (Blob) with token refresh support.
 * Useful for previews/downloads where using a plain <a href> would drop the Authorization header.
 */
export async function apiGetBlob(
  path: string,
  params?: Record<string, unknown> | { params?: Record<string, unknown> },
  skipTokenRefresh: boolean = false,
): Promise<Blob> {
  const apiUrl = getApiUrl(path);
  const url = new URL(apiUrl);
  const normalizedParams = normalizeQueryParams(params);

  // Preserve trailing slash - URL constructor removes it from pathname
  const hadTrailingSlash = apiUrl.endsWith("/") && !apiUrl.includes("?");
  if (hadTrailingSlash && !url.pathname.endsWith("/")) {
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

  let res = await fetch(urlString, {
    method: "GET",
    headers: getHeaders("GET"),
    credentials: "include",
  });

  // Handle 401 with token refresh (only if not already retrying)
  if (res.status === 401 && !skipTokenRefresh) {
    console.log(`[API] Got 401 for BLOB ${urlString}, attempting token refresh...`);
    const newToken = await refreshAccessToken();

    if (newToken) {
      console.log(`[API] Retrying BLOB request with new token...`);
      res = await fetch(urlString, {
        method: "GET",
        headers: getHeaders("GET"), // picks up refreshed token from localStorage
        credentials: "include",
      });
    }
  }

  if (!res.ok) {
    resetRetryDelay(urlString);
    let errorText: string | undefined;
    try {
      errorText = await res.text();
    } catch {
      // ignore
    }
    throw createApiError("GET", urlString, res.status, errorText);
  }

  resetRetryDelay(urlString);
  return await res.blob();
}

/**
 * POST request helper with retry logic and token refresh
 */
export async function apiPost<T>(path: string, body: unknown, maxRetries: number = 3, skipTokenRefresh: boolean = false): Promise<T> {
  const url = getApiUrl(path);

  let lastError: Error | null = null;
  let tokenRefreshAttempted = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

      if (isFormData) {
        console.log(`[API POST] Sending FormData to ${url}`);
        // Debug FormData content
        for (const [key, value] of (body as FormData).entries()) {
          console.log(`  ${key}: ${value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value}`);
        }
      } else {
        console.log(`[API POST] Sending JSON to ${url}`, body);
      }

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

      let res = await fetch(url, {
        ...requestInit,
      });

      // Handle 401 with token refresh (only once per request)
      if (res.status === 401 && !skipTokenRefresh && !tokenRefreshAttempted) {
        console.log(`[API] Got 401 for POST ${url}, attempting token refresh...`);
        tokenRefreshAttempted = true;
        const newToken = await refreshAccessToken();

        if (newToken) {
          // Retry the request with the new token
          console.log(`[API] Retrying POST request with new token...`);
          const retryHeaders = getHeaders('POST');
          if (isFormData) {
            delete retryHeaders['Content-Type'];
          }
          res = await fetch(url, {
            method: "POST",
            headers: retryHeaders,
            credentials: "include",
            body: body !== undefined && body !== null
              ? (isFormData ? (body as FormData) : JSON.stringify(body))
              : undefined,
          });
        }
      }

      if (!res.ok) {
        // Handle rate limiting (429) with exponential backoff
        if (res.status === 429 && attempt < maxRetries) {
          const delay = getRetryDelay(url);
          console.log(`[API RETRY] Rate limited (429), waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        const text = await res.text();
        console.error(`[API POST] Error ${res.status} from ${url}:`, text);
        throw createApiError("POST", url, res.status, text);
      }

      // Reset retry delay on success
      resetRetryDelay(url);

      const responseData = await res.json();
      console.log(`[API POST] ✓ Success ${res.status} from ${url}:`, responseData);
      const data = attachApiResponseData(responseData as T);

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
 * PUT request helper with token refresh
 */
export async function apiPut<T>(path: string, body: unknown, skipTokenRefresh: boolean = false): Promise<T> {
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

  let res = await fetch(url, requestInit);

  // Handle 401 with token refresh
  if (res.status === 401 && !skipTokenRefresh) {
    console.log(`[API] Got 401 for PUT ${url}, attempting token refresh...`);
    const newToken = await refreshAccessToken();

    if (newToken) {
      console.log(`[API] Retrying PUT request with new token...`);
      const retryHeaders = getHeaders('PUT');
      if (isFormData) {
        delete retryHeaders['Content-Type'];
      }
      res = await fetch(url, {
        method: "PUT",
        headers: retryHeaders,
        credentials: "include",
        body: body !== undefined && body !== null
          ? (isFormData ? (body as FormData) : JSON.stringify(body))
          : undefined,
      });
    }
  }

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
 * PATCH request helper with token refresh
 */
export async function apiPatch<T>(path: string, body: unknown, skipTokenRefresh: boolean = false): Promise<T> {
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
  let res = await fetch(url, requestInit);

  // Handle 401 with token refresh
  if (res.status === 401 && !skipTokenRefresh) {
    console.log(`[API] Got 401 for PATCH ${url}, attempting token refresh...`);
    const newToken = await refreshAccessToken();

    if (newToken) {
      console.log(`[API] Retrying PATCH request with new token...`);
      const retryHeaders = getHeaders('PATCH');
      if (isFormData) {
        delete retryHeaders['Content-Type'];
      }
      res = await fetch(url, {
        method: "PATCH",
        headers: retryHeaders,
        credentials: "include",
        body: body !== undefined && body !== null
          ? (isFormData ? (body as FormData) : JSON.stringify(body))
          : undefined,
      });
    }
  }

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
 * DELETE request helper with token refresh
 */
export async function apiDelete<T>(path: string, skipTokenRefresh: boolean = false): Promise<T> {
  const url = getApiUrl(path);

  let res = await fetch(url, {
    method: "DELETE",
    headers: getHeaders('DELETE'),
    credentials: "include",
  });

  // Handle 401 with token refresh
  if (res.status === 401 && !skipTokenRefresh) {
    console.log(`[API] Got 401 for DELETE ${url}, attempting token refresh...`);
    const newToken = await refreshAccessToken();

    if (newToken) {
      console.log(`[API] Retrying DELETE request with new token...`);
      res = await fetch(url, {
        method: "DELETE",
        headers: getHeaders('DELETE'),
        credentials: "include",
      });
    }
  }

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

// Internal Manager nested type (when reading from API)
export type InternalManager = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
};

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
  trial_ends_at?: string | null;
  premium_enabled?: boolean;
  iot_enabled?: boolean;
  heating_system?: string;
  heating_fixed_percentage?: number;
  // Νέα πεδία για εσωτερικό διαχειριστή (ForeignKey)
  internal_manager?: InternalManager | null;
  internal_manager_id?: number | null;
  internal_manager_can_record_payments?: boolean;
  internal_manager_display_name?: string;
  permissions?: {
    can_view?: boolean;
    can_edit?: boolean;
    can_delete?: boolean;
    can_manage_financials?: boolean;
    can_view_financials?: boolean;
    can_record_payments?: boolean;
    can_create_assembly?: boolean;
    can_manage_offers?: boolean;
    is_admin_level?: boolean;
    is_internal_manager?: boolean;
    is_resident?: boolean;
  };
  // Legacy πεδία (backward compatibility)
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

export type BuildingPayload = Partial<Omit<Building, 'id' | 'created_at' | 'updated_at' | 'latitude' | 'longitude' | 'internal_manager'>> & {
  latitude?: number | null;
  longitude?: number | null;
  // Write-only: για να ορίσεις τον εσωτερικό διαχειριστή στέλνεις το ID
  internal_manager_id?: number | null;
};

export type BuildingsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Building[];
};

// ✅ Removed local buildingsCache - using global cache only (React Query handles caching)
export async function fetchAllBuildings(): Promise<Building[]> {
  const params = { page_size: 1000, page: 1 };
  const attemptOrder: Array<{ path: string }> = [
    { path: '/buildings/' },
    { path: '/buildings/public/' },
  ];

  let lastError: unknown = null;

  for (const attempt of attemptOrder) {
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

/**
 * Fetch buildings that belong to the current user (via BuildingMembership)
 * Uses /api/buildings/my-buildings/ endpoint
 * This is used for residents to see only their buildings
 */
export async function fetchMyBuildings(): Promise<Building[]> {
  try {
    console.log('[API CALL] Fetching user buildings from /buildings/my-buildings/');
    const data = await apiGet<Building[]>('/buildings/my-buildings/');

    // The endpoint returns an array directly (not paginated)
    if (Array.isArray(data)) {
      console.log('[API CALL] Found', data.length, 'user buildings');
      return data;
    }

    // Handle if it returns paginated response
    if ('results' in data && Array.isArray((data as Paginated<Building>).results)) {
      const buildings = (data as Paginated<Building>).results;
      console.log('[API CALL] Found', buildings.length, 'user buildings (paginated)');
      return buildings;
    }

    console.warn('[API CALL] Unexpected response format from my-buildings:', data);
    return [];
  } catch (error) {
    console.error('[API CALL] Error fetching user buildings:', error);
    return [];
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
  const response = await apiGet<Building | BuildingsResponse>(`/buildings/list/${id}/`);

  // Handle both single object and list response (workaround for routing issues)
  if ('results' in response && Array.isArray(response.results)) {
    // If we got a list response, find the building by ID
    const building = response.results.find(b => b.id === id);
    if (!building) {
      throw new Error(`Building with ID ${id} not found`);
    }
    console.log(`[fetchBuilding] Extracted building ${id} from list response`);
    return building;
  }

  // Single object response (expected format)
  return response as Building;
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
  building_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_currently_active?: boolean;
  status_display?: string | null;
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
    // Some backends expect building_id, keep both for compatibility
    params.building_id = buildingId;
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
  building_name?: string | null;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  is_currently_active?: boolean;
  status_display?: string | null;
  is_urgent?: boolean;
  days_remaining?: number | null;
  total_votes?: number;
  participation_percentage?: number | null;
  min_participation?: number | null;
  is_valid?: boolean;
  eligible_voters_count?: number;
  total_building_mills?: number;
  choices?: string[];
  created_at: string;
  updated_at: string;
};

export type VoteSubmission = {
  id: number;
  vote: number;
  choice: string;
  user: number;
};

export type VoteResultsData = Record<string, any> & { total?: number };

export type LinkedVoteSubmission = {
  apartment_id: number;
  apartment_number: string;
  mills: number;
  choice: string | null;
  vote_source: string | null;
  submitted_at: string | null;
  receipt_id?: string | null;
};

export type MyVoteResponse =
  | { linked: true; submissions: LinkedVoteSubmission[] }
  | VoteSubmission
  | { id: null; choice: null };

export type CreateVotePayload = {
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  building?: number | null;
  choices?: string[];  // Optional - backend has default choices
  is_active?: boolean; // Optional - defaults to true on backend
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

export async function fetchMyVote(voteId: number, buildingId?: number | null): Promise<VoteSubmission | null> {
  try {
    // VoteViewSet exposes /api/votes/{id}/my-submission/
    const params: Record<string, number> = {};
    if (typeof buildingId === 'number') {
      params.building = buildingId;
    }
    const data = await apiGet<unknown>(`/votes/${voteId}/my-submission/`, params);
    if (!data || typeof data !== 'object') return null;
    const record = data as Partial<VoteSubmission> & { choice?: unknown };
    if (!record.id) return null;
    if (record.choice === null || record.choice === undefined) return null;
    return record as VoteSubmission;
  } catch (error: unknown) {
    const apiError = error as { status?: number };
    if (apiError.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function submitVote(
  voteId: number,
  choice: string,
  buildingId?: number | null,
  apartmentId?: number | null,
): Promise<unknown> {
  // Backend endpoint is `/api/votes/{id}/vote/` (not `/submit/`)
  const query = typeof buildingId === 'number' ? `?building=${buildingId}` : '';
  const payload: Record<string, any> = { choice };
  if (typeof apartmentId === 'number') {
    payload.apartment_id = apartmentId;
  }
  return apiPost<unknown>(`/votes/${voteId}/vote/${query}`, payload);
}

export async function fetchVoteResults(
  voteId: number,
  buildingId?: number | null,
): Promise<{ results: VoteResultsData; total: number }> {
  const params: Record<string, number> = {};
  if (typeof buildingId === 'number') {
    params.building = buildingId;
  }
  const raw = await apiGet<VoteResultsData>(`/votes/${voteId}/results/`, params);
  const total =
    typeof raw?.total === 'number'
      ? raw.total
      : (Number(raw?.ΝΑΙ ?? 0) + Number(raw?.ΟΧΙ ?? 0) + Number(raw?.ΛΕΥΚΟ ?? 0));
  return { results: raw, total };
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
  type?: string;
  priority?: string;
  location?: string;
  apartment_number?: string;
  is_urgent?: boolean;
  photos?: File[];
};

export type UpdateUserRequestPayload = Partial<CreateUserRequestPayload> & {
  status?: string;
};

export async function fetchRequests(filters: { status?: string; buildingId?: number | null } = {}): Promise<UserRequest[]> {
  const params: Record<string, string | number> = {};
  if (filters.status) {
    params.status = filters.status;
  }
  if (typeof filters.buildingId === 'number') {
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

export async function fetchRequest(id: number | string, buildingId?: number | null): Promise<UserRequest> {
  const params: Record<string, number> = {};
  if (buildingId) {
    params.building = buildingId;
  }
  return apiGet<UserRequest>(`/user-requests/${id}/`, params);
}

export async function createUserRequest(payload: CreateUserRequestPayload): Promise<UserRequest> {
  const buildingId = payload.building;
  const url = buildingId ? `/user-requests/?building=${buildingId}` : '/user-requests/';

  // If we have photos, we MUST use FormData
  if (payload.photos && payload.photos.length > 0) {
    const formData = new FormData();

    // Add all fields to FormData
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'photos' && Array.isArray(value)) {
        value.forEach((file) => {
          formData.append('photos', file);
        });
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    return apiPost<UserRequest>(url, formData);
  }

  // Standard JSON request
  return apiPost<UserRequest>(url, payload);
}

export async function updateUserRequest(
  id: number,
  payload: UpdateUserRequestPayload,
  buildingId?: number | null,
): Promise<UserRequest> {
  const query = typeof buildingId === 'number' ? `?building=${buildingId}` : '';
  return apiPatch<UserRequest>(`/user-requests/${id}/${query}`, payload);
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
  rent_start_date?: string | null;
  rent_end_date?: string | null;
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
  owner_user?: number | null;  // User ID αν ο ιδιοκτήτης είναι καταχωρημένος
  owner_has_access?: boolean; // Membership στο κτίριο + ενεργός λογαριασμός
  ownership_percentage?: number;
  participation_mills?: number;
  heating_mills?: number;
  elevator_mills?: number;
  tenant_name: string;
  tenant_phone: string;
  tenant_phone2: string;
  tenant_email: string;
  tenant_user?: number | null;  // User ID αν ο ένοικος είναι καταχωρημένος
  tenant_has_access?: boolean; // Membership στο κτίριο + ενεργός λογαριασμός
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

export async function vacateApartment(apartmentId: number, type: 'tenant' | 'owner'): Promise<{
  message: string;
  removed_membership: boolean;
  removed_internal_manager: boolean;
}> {
  return await apiPost<{ message: string; removed_membership: boolean; removed_internal_manager: boolean }>(
    `/apartments/${apartmentId}/vacate/`,
    { type }
  );
}

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
  user_id?: number | null;  // User ID για internal_manager_id (όταν υπάρχει user account)
};

export type BuildingResidentsResponse = {
  residents: BuildingResident[];
};

export async function fetchBuildingResidents(buildingId: number): Promise<BuildingResidentsResponse> {
  try {
    const data = await apiGet<unknown>(`/apartments/building-residents/${buildingId}/`);

    let residents: BuildingResident[] = [];

    if (Array.isArray(data)) {
      residents = data as BuildingResident[];
    } else if (data && typeof data === 'object') {
      const record = data as Partial<{
        residents?: BuildingResident[];
        results?: BuildingResident[];
      }>;
      if (Array.isArray(record.residents)) {
        residents = record.residents;
      } else if (Array.isArray(record.results)) {
        residents = record.results;
      }
    }

    return { residents };
  } catch (error) {
    if (isNotFoundError(error)) {
      console.warn('[fetchBuildingResidents] Endpoint returned 404, returning empty list');
      return { residents: [] };
    }
    throw error;
  }
}

export type UpdateTenantData = {
  tenant_name?: string;
  tenant_phone?: string;
  tenant_phone2?: string;
  tenant_email?: string;
  is_rented?: boolean;
  is_closed?: boolean;
  rent_start_date?: string | null;
  rent_end_date?: string | null;
};

export async function updateApartmentTenant(apartmentId: number, tenantData: UpdateTenantData): Promise<ApartmentList> {
  try {
    const response = await apiPost<{ apartment: ApartmentList; message: string }>(
      `/apartments/${apartmentId}/update-tenant/`,
      tenantData
    );
    return response.apartment;
  } catch (error) {
    console.error('[updateApartmentTenant] Error updating tenant:', error);
    throw error;
  }
}

export type UpdateOwnerData = {
  owner_name?: string;
  owner_phone?: string;
  owner_phone2?: string;
  owner_email?: string;
  identifier?: string;
  participation_mills?: number | null;
  heating_mills?: number | null;
  elevator_mills?: number | null;
};

export async function updateApartmentOwner(apartmentId: number, ownerData: UpdateOwnerData): Promise<ApartmentList> {
  try {
    const response = await apiPost<{ apartment: ApartmentList; message: string }>(
      `/apartments/${apartmentId}/update-owner/`,
      ownerData
    );
    return response.apartment;
  } catch (error) {
    console.error('[updateApartmentOwner] Error updating owner:', error);
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

/**
 * Scan invoice image using Google Gemini AI
 * Returns extracted data: amount, date, supplier, category, description
 */
export async function scanInvoice(file: File): Promise<import('@/types/financial').ScannedInvoiceData> {
  const formData = new FormData();
  formData.append('file', file);

  return await apiPost<import('@/types/financial').ScannedInvoiceData>(
    '/financial/expenses/scan/',
    formData
  );
}

// ============================================================================
// Data Migration API Functions
// ============================================================================

import type {
  MigrationAnalysisResult,
  MigrationBuildingInfo,
  MigrationApartment,
  MigrationResident,
  MigrationValidationResult,
  MigrationImportResponse,
} from '@/types/dataMigration';

export async function analyzeMigrationImages(files: File[]): Promise<MigrationAnalysisResult> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await apiPost<{ success: boolean; data: MigrationAnalysisResult }>(
    '/data-migration/analyze-images/',
    formData
  );

  return response.data;
}

export async function validateMigrationData(payload: {
  building_info: MigrationBuildingInfo;
  apartments: MigrationApartment[];
  residents: MigrationResident[];
}): Promise<MigrationValidationResult> {
  return await apiPost<MigrationValidationResult>(
    '/data-migration/validate-data/',
    payload
  );
}

export async function importMigrationData(payload: {
  building_info: MigrationBuildingInfo;
  apartments: MigrationApartment[];
  residents: MigrationResident[];
  target_building_id: 'new' | number | string;
}): Promise<MigrationImportResponse> {
  return await apiPost<MigrationImportResponse>(
    '/data-migration/import-data/',
    payload
  );
}

// ============================================================================
// Electronic Archive API Functions
// ============================================================================

export async function fetchArchiveDocuments(
  params?: Record<string, unknown>,
): Promise<{ results?: import('@/types/archive').ArchiveDocument[] } | import('@/types/archive').ArchiveDocument[]> {
  return await apiGet('/archive/documents/', params);
}

export async function fetchArchiveCategories(): Promise<{ value: string; label: string }[]> {
  return await apiGet('/archive/documents/categories/');
}

export async function fetchArchiveDocumentTypes(): Promise<{ value: string; label: string }[]> {
  return await apiGet('/archive/documents/document_types/');
}

export async function createArchiveDocument(
  formData: FormData,
): Promise<import('@/types/archive').ArchiveDocument> {
  return await apiPost<import('@/types/archive').ArchiveDocument>(
    '/archive/documents/',
    formData,
  );
}

export async function deleteArchiveDocument(id: number): Promise<void> {
  await apiDelete(`/archive/documents/${id}/`);
}

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

// ============================================================================
// INVITATION API
// ============================================================================

export type UserInvitation = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  invitation_type: 'registration' | 'building_access' | 'role_assignment';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  building_id?: number | null;
  building_name?: string;
  assigned_role?: 'resident' | 'internal_manager' | 'manager' | 'staff' | null;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by: number;
  invited_by_name?: string;
  created_user_id?: number | null;
  created_user_active?: boolean | null;
};

export type CreateInvitationPayload = {
  email: string;
  first_name?: string;
  last_name?: string;
  invitation_type?: 'registration' | 'building_access' | 'role_assignment';
  building_id?: number | null;
  apartment_id?: number | null;
  assigned_role?: 'resident' | 'internal_manager' | 'manager' | 'staff' | null;
};

export async function createInvitation(payload: CreateInvitationPayload): Promise<UserInvitation> {
  return await apiPost<UserInvitation>('/users/invite/', payload);
}

export async function listInvitations(): Promise<UserInvitation[]> {
  return await apiGet<UserInvitation[]>('/users/invitations/');
}

export async function acceptInvitation(token: string, password: string): Promise<{ access: string; refresh: string }> {
  return await apiPost<{ access: string; refresh: string }>('/users/accept-invitation/', { token, password });
}

export async function sendMyApartmentLinkEmail(): Promise<{ message: string; link_url?: string }> {
  // Empty body, but POST required for throttling and consistent API patterns
  return await apiPost<{ message: string; link_url?: string }>('/users/send-myapartment-link/', {});
}

export type ResendInvitationPayload = {
  invitation_id?: number;
  email?: string;
  building_id?: number;
  assigned_role?: 'resident' | 'internal_manager' | 'manager' | 'staff' | null;
};

export async function resendInvitation(payload: ResendInvitationPayload): Promise<{ message: string; invitation: UserInvitation }> {
  return await apiPost<{ message: string; invitation: UserInvitation }>('/users/invitations/resend/', payload);
}

export async function deleteInvitation(invitationId: string | number): Promise<void> {
  await apiDelete(`/users/invitations/${invitationId}/`);
}

export async function cancelInvitation(invitationId: string | number): Promise<{ message: string }> {
  return await apiPost<{ message: string }>(`/users/invitations/${invitationId}/cancel/`, {});
}

export async function deactivateUser(userId: number): Promise<{ message: string }> {
  return await apiPost<{ message: string }>(`/users/${userId}/deactivate/`, {});
}

export async function activateUser(userId: number): Promise<{ message: string }> {
  return await apiPost<{ message: string }>(`/users/${userId}/activate/`, {});
}

/**
 * Remove a user from a specific building (deletes BuildingMembership).
 * This does NOT deactivate the user - they can still access other buildings.
 */
export async function removeUserFromBuilding(userId: number, buildingId: number): Promise<{
  message: string;
  remaining_buildings: number;
  user_still_active: boolean;
}> {
  // Use actions/ path to ensure clean matching
  return await apiPost<{ message: string; remaining_buildings: number; user_still_active: boolean }>(
    `/buildings/actions/remove-membership/`,
    { user_id: userId, building_id: buildingId }
  );
}

/**
 * Add a user to a building (creates BuildingMembership).
 */
export async function addUserToBuilding(userId: number, buildingId: number, role: string = 'resident'): Promise<{
  message: string;
  membership_id: number;
}> {
  // Use actions/ path to ensure clean matching
  return await apiPost<{ message: string; membership_id: number }>(
    `/buildings/actions/add-membership/`,
    { user_id: userId, building_id: buildingId, role }
  );
}

// ============================================================================
// User Management API Functions
// ============================================================================

export async function fetchUsers(buildingId?: number): Promise<User[]> {
  const url = buildingId ? `/users/?building=${buildingId}` : '/users/';
  const response = await apiGet<User[] | { results: User[]; count?: number }>(url);
  // Handle both array response and paginated response from DRF
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === 'object' && 'results' in response) {
    return response.results;
  }
  console.warn('[fetchUsers] Unexpected response format:', response);
  return [];
}

export type UpdateUserPayload = {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
};

export async function updateUser(userId: number, payload: UpdateUserPayload): Promise<User> {
  return await apiPatch<User>(`/users/${userId}/`, payload);
}

export async function deleteUser(userId: number): Promise<void> {
  return await apiDelete(`/users/${userId}/`);
}

// ============================================================
// 📋 ASSEMBLIES (Γενικές Συνελεύσεις)
// ============================================================

export type AssemblyStatus =
  | 'draft'
  | 'scheduled'
  | 'convened'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'adjourned';

export type AssemblyType = 'regular' | 'extraordinary' | 'continuation';

export type AgendaItemType = 'informational' | 'discussion' | 'voting' | 'approval';
export type AgendaItemStatus = 'pending' | 'in_progress' | 'completed' | 'deferred' | 'cancelled';
export type VotingType = 'simple_majority' | 'qualified_majority' | 'unanimous' | 'relative_majority';

export type RSVPStatus = 'pending' | 'attending' | 'not_attending' | 'maybe';
export type AttendanceType = 'in_person' | 'online' | 'proxy' | 'pre_vote_only';
export type VoteChoice = 'approve' | 'reject' | 'abstain';
export type VoteSource = 'pre_vote' | 'live' | 'proxy';

export type AgendaItem = {
  id: string;
  assembly: string;
  order: number;
  title: string;
  description: string;
  item_type: AgendaItemType;
  item_type_display: string;
  estimated_duration: number;
  actual_duration: number | null;
  started_at: string | null;
  ended_at: string | null;
  presenter: number | null;
  presenter_name: string;
  presenter_name_display: string | null;
  status: AgendaItemStatus;
  status_display: string;
  time_status: string | null;
  voting_type: VotingType;
  voting_type_display: string;
  allows_pre_voting: boolean;
  is_voting_item: boolean;
  linked_vote: number | null;
  linked_project: string | null;
  linked_project_title: string | null;
  decision: string;
  decision_type: string;
  discussion_notes: string;
  has_attachments: boolean;
  vote_results: {
    total_votes: number;
    approve_votes: number;
    reject_votes: number;
    abstain_votes: number;
    approve_mills: number;
    reject_mills: number;
    abstain_mills: number;
    total_mills: number;
    approve_percentage: number;
    reject_percentage: number;
    abstain_percentage: number;
  } | null;
  created_at: string;
  updated_at: string;
};

export type AssemblyAttendee = {
  id: string;
  assembly: string;
  apartment: number;
  apartment_number: string;
  user: number | null;
  display_name: string;
  mills: number;
  rsvp_status: RSVPStatus;
  rsvp_status_display: string;
  rsvp_at: string | null;
  rsvp_notes: string;
  attendance_type: AttendanceType;
  attendance_type_display: string;
  is_present: boolean;
  checked_in_at: string | null;
  checked_out_at: string | null;
  is_proxy: boolean;
  proxy_from_apartment: number | null;
  proxy_to_attendee: string | null;
  proxy_to_type: 'attendee' | 'management' | 'external' | '';
  proxy_to_name: string;
  proxy_to_email: string;
  proxy_assigned_at: string | null;
  proxy_to_display: string | null;
  has_pre_voted: boolean;
  pre_voted_at: string | null;
  attendee_name: string;
  attendee_phone: string;
  created_at: string;
  updated_at: string;
};

export type Assembly = {
  id: string;
  title: string;
  building: number;
  building_name: string;
  assembly_type: AssemblyType;
  assembly_type_display: string;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration: number;
  is_physical: boolean;
  is_online: boolean;
  location: string;
  meeting_link: string;
  meeting_id: string;
  meeting_password: string;
  total_building_mills: number;
  required_quorum_percentage: number;
  required_quorum_mills: number;
  achieved_quorum_mills: number;
  quorum_achieved: boolean;
  quorum_achieved_at: string | null;
  quorum_percentage: number;
  quorum_status: 'achieved' | 'close' | 'far';
  status: AssemblyStatus;
  status_display: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  pre_voting_enabled: boolean;
  pre_voting_start_date: string | null;
  pre_voting_end_date: string | null;
  is_pre_voting_active: boolean;
  minutes_text: string;
  minutes_approved: boolean;
  minutes_approved_at: string | null;
  invitation_sent: boolean;
  invitation_sent_at: string | null;
  linked_announcement: number | null;
  continued_from: string | null;
  continued_from_title: string | null;
  total_agenda_duration: number;
  is_upcoming: boolean;
  agenda_items: AgendaItem[];
  attendees: AssemblyAttendee[];
  stats: {
    total_apartments_invited: number;
    rsvp_attending: number;
    rsvp_not_attending: number;
    rsvp_pending: number;
    present_count: number;
    pre_voted_count: number;
    agenda_items_total: number;
    agenda_items_completed: number;
    agenda_items_pending: number;
    voting_items_count: number;
  };
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AssemblyListItem = Pick<Assembly,
  'id' | 'title' | 'building' | 'building_name' | 'assembly_type' | 'assembly_type_display' |
  'scheduled_date' | 'scheduled_time' | 'estimated_duration' | 'status' | 'status_display' |
  'is_physical' | 'is_online' | 'location' | 'quorum_percentage' | 'quorum_achieved' |
  'quorum_status' | 'is_upcoming' | 'is_pre_voting_active' | 'pre_voting_enabled' |
  'invitation_sent' | 'created_at'
> & {
  agenda_items_count: number;
  attendees_count: number;
};

export type AssemblyVote = {
  id: string;
  agenda_item: string;
  attendee: string;
  attendee_name: string;
  apartment_number: string;
  vote: VoteChoice;
  vote_display: string;
  mills: number;
  vote_source: VoteSource;
  voted_at: string;
  notes: string;
};

export type CreateAssemblyPayload = {
  title: string;
  building: number;
  assembly_type?: AssemblyType;
  description?: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration?: number;
  is_physical?: boolean;
  is_online?: boolean;
  location?: string;
  meeting_link?: string;
  meeting_id?: string;
  meeting_password?: string;
  total_building_mills?: number;
  required_quorum_percentage?: number;
  pre_voting_enabled?: boolean;
  pre_voting_start_date?: string;
  pre_voting_end_date?: string;
  agenda_items?: Array<{
    order: number;
    title: string;
    description?: string;
    item_type: AgendaItemType;
    estimated_duration?: number;
    presenter_name?: string;
    voting_type?: VotingType;
    allows_pre_voting?: boolean;
  }>;
};

export type UpdateAssemblyPayload = Partial<CreateAssemblyPayload> & {
  /**
   * Editable minutes markdown. Stored in Assembly.minutes_text (backend).
   * Not used on create, but supported on PATCH.
   */
  minutes_text?: string;
};

export type CreateAgendaItemPayload = {
  assembly?: string;
  order: number;
  title: string;
  description?: string;
  item_type: AgendaItemType;
  estimated_duration?: number;
  presenter?: number;
  presenter_name?: string;
  voting_type?: VotingType;
  allows_pre_voting?: boolean;
  linked_project?: string;
};

// Assembly API functions

export async function fetchAssemblies(buildingId?: number | null): Promise<AssemblyListItem[]> {
  const params = buildingId ? `?building=${buildingId}` : '';
  const response = await apiGet<Paginated<AssemblyListItem>>(`/assemblies/${params}`);
  return extractResults(response);
}

export async function fetchAssembly(assemblyId: string): Promise<Assembly> {
  return await apiGet<Assembly>(`/assemblies/${assemblyId}/`);
}

export async function createAssembly(payload: CreateAssemblyPayload): Promise<Assembly> {
  return await apiPost<Assembly>('/assemblies/', payload);
}

export async function updateAssembly(assemblyId: string, payload: UpdateAssemblyPayload): Promise<Assembly> {
  return await apiPatch<Assembly>(`/assemblies/${assemblyId}/`, payload);
}

export async function deleteAssembly(assemblyId: string): Promise<void> {
  return await apiDelete(`/assemblies/${assemblyId}/`);
}

export async function startAssembly(assemblyId: string): Promise<{ message: string; started_at: string }> {
  return await apiPost(`/assemblies/${assemblyId}/start/`, {});
}

export async function endAssembly(assemblyId: string): Promise<{ message: string; ended_at: string }> {
  return await apiPost(`/assemblies/${assemblyId}/end/`, {});
}

export async function adjournAssembly(
  assemblyId: string,
  continuationDate?: string
): Promise<{ message: string; continuation_assembly?: { id: string; title: string; scheduled_date: string } }> {
  return await apiPost(`/assemblies/${assemblyId}/adjourn/`, { continuation_date: continuationDate });
}

export async function sendAssemblyInvitation(assemblyId: string): Promise<{ message: string; sent_at: string }> {
  return await apiPost(`/assemblies/${assemblyId}/send_invitation/`, {});
}

export async function getAssemblyQuorum(assemblyId: string): Promise<{
  total_building_mills: number;
  required_quorum_mills: number;
  required_quorum_percentage: number;
  achieved_quorum_mills: number;
  quorum_percentage: number;
  quorum_achieved: boolean;
  quorum_achieved_at: string | null;
  quorum_status: string;
  present_attendees: number;
}> {
  return await apiGet(`/assemblies/${assemblyId}/quorum/`);
}

export async function generateAssemblyMinutes(
  assemblyId: string,
  options?: { template_id?: string; secretary_name?: string; chairman_name?: string }
): Promise<{ message?: string; minutes_text: string; approved?: boolean }> {
  if (options) {
    return await apiPost(`/assemblies/${assemblyId}/generate_minutes/`, options);
  }
  return await apiGet(`/assemblies/${assemblyId}/generate_minutes/`);
}

export async function approveAssemblyMinutes(assemblyId: string): Promise<{ message: string; approved_at: string }> {
  return await apiPost(`/assemblies/${assemblyId}/approve_minutes/`, {});
}

export async function downloadAssemblyMinutes(assemblyId: string): Promise<Blob> {
  const response = await fetch(getApiUrl(`/assemblies/${assemblyId}/download_pdf/`), {
    method: "GET",
    headers: getHeaders("GET"),
  });

  if (!response.ok) {
    throw new Error('Failed to download PDF');
  }

  return await response.blob();
}

export async function getAssemblyLiveStatus(assemblyId: string): Promise<{
  status: AssemblyStatus;
  quorum_achieved: boolean;
  quorum_percentage: number;
  present_count: number;
  current_agenda_item: AgendaItem | null;
  completed_items: number;
  total_items: number;
  elapsed_time: number;
}> {
  return await apiGet(`/assemblies/${assemblyId}/live_status/`);
}

// Agenda Item API functions

export async function fetchAgendaItems(assemblyId: string): Promise<AgendaItem[]> {
  const response = await apiGet<Paginated<AgendaItem>>(`/agenda-items/?assembly=${assemblyId}`);
  return extractResults(response);
}

export async function createAgendaItem(assemblyId: string, payload: CreateAgendaItemPayload): Promise<AgendaItem> {
  return await apiPost<AgendaItem>('/agenda-items/', { ...payload, assembly: assemblyId });
}

export async function updateAgendaItem(itemId: string, payload: Partial<CreateAgendaItemPayload>): Promise<AgendaItem> {
  return await apiPatch<AgendaItem>(`/agenda-items/${itemId}/`, payload);
}

export async function deleteAgendaItem(itemId: string): Promise<void> {
  return await apiDelete(`/agenda-items/${itemId}/`);
}

export async function startAgendaItem(itemId: string): Promise<{ message: string; started_at: string }> {
  return await apiPost(`/agenda-items/${itemId}/start/`, {});
}

export async function endAgendaItem(
  itemId: string,
  options?: { decision?: string; decision_type?: string }
): Promise<{ message: string; ended_at: string; actual_duration: number }> {
  return await apiPost(`/agenda-items/${itemId}/end/`, options || {});
}

export async function deferAgendaItem(itemId: string, reason?: string): Promise<{ message: string }> {
  return await apiPost(`/agenda-items/${itemId}/defer/`, { reason });
}

export async function getAgendaItemVoteResults(itemId: string): Promise<{
  agenda_item: { id: string; title: string; voting_type: VotingType };
  summary: {
    approve: { count: number; mills: number };
    reject: { count: number; mills: number };
    abstain: { count: number; mills: number };
    total: { count: number; mills: number };
  };
  votes: AssemblyVote[];
}> {
  return await apiGet(`/agenda-items/${itemId}/vote_results/`);
}

// Attendee API functions

export async function fetchAssemblyAttendees(assemblyId: string): Promise<AssemblyAttendee[]> {
  const pageSize = 1000;
  const firstPage = await apiGet<Paginated<AssemblyAttendee>>('/assembly-attendees/', {
    assembly: assemblyId,
    page_size: pageSize,
    page: 1,
  });

  let attendees = extractResults(firstPage);
  if (Array.isArray(firstPage)) return attendees;

  const totalCount = typeof (firstPage as any)?.count === 'number' ? (firstPage as any).count : attendees.length;
  let next = (firstPage as any)?.next as string | null | undefined;
  let page = 2;

  while (next && attendees.length < totalCount && page < 50) {
    const data = await apiGet<Paginated<AssemblyAttendee>>('/assembly-attendees/', {
      assembly: assemblyId,
      page_size: pageSize,
      page,
    });
    attendees = attendees.concat(extractResults(data));

    if (Array.isArray(data)) break;
    next = (data as any)?.next as string | null | undefined;
    page += 1;
  }

  return attendees;
}

export async function attendeeCheckIn(
  attendeeId: string,
  attendanceType: AttendanceType = 'in_person'
): Promise<{ message: string; checked_in_at: string; assembly_quorum: { achieved_mills: number; quorum_achieved: boolean } }> {
  return await apiPost(`/assembly-attendees/${attendeeId}/check_in/`, { attendance_type: attendanceType });
}

export async function attendeeCheckOut(attendeeId: string): Promise<{ message: string; checked_out_at: string }> {
  return await apiPost(`/assembly-attendees/${attendeeId}/check_out/`, {});
}

export async function attendeeRSVP(
  attendeeId: string,
  status: RSVPStatus,
  notes?: string
): Promise<{ message: string; rsvp_status: RSVPStatus; rsvp_at: string }> {
  return await apiPost(`/assembly-attendees/${attendeeId}/rsvp/`, { rsvp_status: status, notes });
}

export type ProxyAssignmentPayload = {
  proxy_type: 'attendee' | 'management' | 'external';
  proxy_attendee_id?: string | null;
  proxy_name?: string;
  proxy_email?: string;
  notes?: string;
  clear?: boolean;
};

export async function attendeeAssignProxy(
  attendeeId: string,
  payload: ProxyAssignmentPayload
): Promise<{ message: string; attendee: AssemblyAttendee }> {
  return await apiPost(`/assembly-attendees/${attendeeId}/proxy/`, payload);
}

export type VoteConsent = {
  termsAccepted?: boolean;
  termsVersion?: string;
  termsAcceptedVia?: string;
};

export async function attendeeCastVote(
  attendeeId: string,
  agendaItemId: string,
  vote: VoteChoice,
  notes?: string,
  consent?: VoteConsent
): Promise<{ message: string; vote: AssemblyVote; created?: boolean; updated?: boolean; previous_vote?: VoteChoice }> {
  return await apiPost(`/assembly-attendees/${attendeeId}/vote/`, {
    agenda_item_id: agendaItemId,
    vote,
    notes,
    ...(consent?.termsAccepted
      ? {
          terms_accepted: true,
          terms_version: consent.termsVersion,
          terms_accepted_via: consent.termsAcceptedVia,
        }
      : {}),
  });
}

// ============================================================
// Ultra Admin - Tenant Management
// ============================================================

/**
 * Tenant representation for Ultra Admin
 */
export type Tenant = {
  id: number;
  schema_name: string;
  name: string;
  primary_domain: string;
  is_primary_domain: boolean;
  on_trial: boolean;
  paid_until: string | null;
  buildings_count: number;
};

export type TenantsResponse = {
  tenants: Tenant[];
  count: number;
};

/**
 * Fetch all tenants (Ultra Admin only)
 * Returns list of active tenants with their domains and building counts
 */
export async function fetchTenants(): Promise<Tenant[]> {
  console.log('[API CALL] Fetching tenants from /tenants/list/');
  const data = await apiGet<TenantsResponse>('/tenants/list/');
  console.log('[API CALL] Found', data.tenants?.length || 0, 'tenants');
  return data.tenants || [];
}

/**
 * Check if the current user is an Ultra Admin
 */
export function isUltraAdmin(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const cached = localStorage.getItem('user');
    if (!cached) return false;

    const parsed = JSON.parse(cached) as {
      role?: string;
      is_superuser?: boolean;
      is_staff?: boolean
    };

    return (
      (String(parsed?.role || '').toLowerCase() === 'admin' || Boolean(parsed?.is_superuser)) &&
      Boolean(parsed?.is_staff)
    );
  } catch {
    return false;
  }
}

/**
 * Get the current Ultra Admin tenant host override
 */
export function getUltraAdminTenantOverride(): string | null {
  if (typeof window === 'undefined') return null;
  const override = localStorage.getItem('ultra_admin_tenant_host_override');
  return override?.trim() || null;
}

/**
 * Set the Ultra Admin tenant host override
 * This allows Ultra Admin to switch between tenants
 */
export function setUltraAdminTenantOverride(host: string | null): void {
  if (typeof window === 'undefined') return;

  const trimmed = (host || '').trim();
  if (trimmed) {
    localStorage.setItem('ultra_admin_tenant_host_override', trimmed);
    console.log('[ULTRA ADMIN] Tenant override set to:', trimmed);
  } else {
    localStorage.removeItem('ultra_admin_tenant_host_override');
    console.log('[ULTRA ADMIN] Tenant override cleared');
  }
}
