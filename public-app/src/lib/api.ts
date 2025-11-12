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

/**
 * Build full API url (absolute in SSR, absolute same-origin on client)
 */
function getApiUrl(path: string): string {
  const normalized = normalizeApiPath(path);
  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }
  const base = getApiBase();
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${trimmedBase}${normalized}`;
}

/**
 * Get headers for API requests
 */
function getHeaders(): Record<string, string> {
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
  }
  
  return headers;
}

/**
 * GET request helper
 */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(getApiUrl(path));
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    });
  }
  
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  
  if (!res.ok) {
    throw createApiError("GET", url.toString(), res.status);
  }
  
  return res.json();
}

/**
 * POST request helper
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = getApiUrl(path);
  
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
    credentials: "include",
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw createApiError("POST", url, res.status, text);
  }
  
  return res.json();
}

/**
 * PUT request helper
 */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const url = getApiUrl(path);
  
  const res = await fetch(url, {
    method: "PUT",
    headers: getHeaders(),
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
    headers: getHeaders(),
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
    headers: getHeaders(),
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


