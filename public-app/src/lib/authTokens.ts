export type TokenStorageOptions = {
  access?: string | null;
  refresh?: string | null;
  refreshCookieSet?: boolean;
  refreshCookieMaxAge?: number | null;
  allowRefreshStorage?: boolean;
  allowAccessStorage?: boolean;
};

const REFRESH_COOKIE_FLAG = 'refresh_cookie_enabled';
const REFRESH_COOKIE_SET_AT = 'refresh_cookie_set_at';
const REFRESH_COOKIE_MAX_AGE = 'refresh_cookie_max_age';
const REFRESH_TOKEN_SKEW_SECONDS = 30;
let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window === 'undefined') return null;
  const stored =
    localStorage.getItem('access_token') ||
    localStorage.getItem('access') ||
    localStorage.getItem('accessToken');
  if (stored) {
    inMemoryAccessToken = stored;
  }
  return stored;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token || null;
}

export function isRefreshCookieEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const enabled = localStorage.getItem(REFRESH_COOKIE_FLAG) === '1';
  if (!enabled) return false;

  const setAtRaw = localStorage.getItem(REFRESH_COOKIE_SET_AT);
  const maxAgeRaw = localStorage.getItem(REFRESH_COOKIE_MAX_AGE);

  if (!setAtRaw || !maxAgeRaw) {
    localStorage.removeItem(REFRESH_COOKIE_FLAG);
    localStorage.removeItem(REFRESH_COOKIE_SET_AT);
    localStorage.removeItem(REFRESH_COOKIE_MAX_AGE);
    return false;
  }

  const setAt = Number(setAtRaw);
  const maxAge = Number(maxAgeRaw);
  if (!Number.isFinite(setAt) || !Number.isFinite(maxAge) || maxAge <= 0) {
    localStorage.removeItem(REFRESH_COOKIE_FLAG);
    localStorage.removeItem(REFRESH_COOKIE_SET_AT);
    localStorage.removeItem(REFRESH_COOKIE_MAX_AGE);
    return false;
  }

  const expiresAt = setAt + (maxAge * 1000);
  if (Date.now() >= expiresAt) {
    localStorage.removeItem(REFRESH_COOKIE_FLAG);
    localStorage.removeItem(REFRESH_COOKIE_SET_AT);
    localStorage.removeItem(REFRESH_COOKIE_MAX_AGE);
    return false;
  }

  return true;
}

export function setRefreshCookieEnabled(enabled: boolean, maxAgeSeconds?: number): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(REFRESH_COOKIE_FLAG, '1');
    if (typeof maxAgeSeconds === 'number' && Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0) {
      localStorage.setItem(REFRESH_COOKIE_SET_AT, String(Date.now()));
      localStorage.setItem(REFRESH_COOKIE_MAX_AGE, String(Math.floor(maxAgeSeconds)));
    }
  } else {
    localStorage.removeItem(REFRESH_COOKIE_FLAG);
    localStorage.removeItem(REFRESH_COOKIE_SET_AT);
    localStorage.removeItem(REFRESH_COOKIE_MAX_AGE);
  }
}

export function storeAuthTokens(options: TokenStorageOptions): void {
  if (typeof window === 'undefined') return;
  const {
    access,
    refresh,
    refreshCookieSet = false,
    refreshCookieMaxAge,
    allowRefreshStorage,
    allowAccessStorage,
  } = options;

  if (access) {
    setAccessToken(access);
    const shouldStoreAccess = allowAccessStorage !== false;
    if (shouldStoreAccess) {
      localStorage.setItem('access_token', access);
      localStorage.setItem('access', access);
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('access');
      localStorage.removeItem('accessToken');
    }
  }

  if (refreshCookieSet) {
    setRefreshCookieEnabled(true, refreshCookieMaxAge ?? undefined);
  }

  const shouldStoreRefresh =
    allowRefreshStorage === true || (!refreshCookieSet && allowRefreshStorage !== false);

  if (shouldStoreRefresh && refresh) {
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('refresh', refresh);
  } else if (refreshCookieSet && !allowRefreshStorage) {
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('refresh');
    localStorage.removeItem('refreshToken');
  }
}

function decodeBase64Url(payload: string): string | null {
  let normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  if (padding) {
    normalized += '='.repeat(4 - padding);
  }
  try {
    if (typeof atob === 'function') {
      return atob(normalized);
    }
  } catch {
    return null;
  }

  try {
    const bufferCtor = typeof globalThis !== 'undefined'
      ? (globalThis as { Buffer?: { from: (input: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer
      : undefined;
    if (bufferCtor) {
      return bufferCtor.from(normalized, 'base64').toString('utf8');
    }
  } catch {
    return null;
  }

  return null;
}

function getJwtExp(token: string): number | null {
  const segments = token.split('.');
  if (segments.length < 2) return null;
  const decoded = decodeBase64Url(segments[1]);
  if (!decoded) return null;
  try {
    const payload = JSON.parse(decoded) as { exp?: number | string } | null;
    if (!payload) return null;
    if (typeof payload.exp === 'number') return payload.exp;
    if (typeof payload.exp === 'string') {
      const parsed = Number(payload.exp);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function isRefreshTokenExpired(token: string, skewSeconds: number = REFRESH_TOKEN_SKEW_SECONDS): boolean {
  const exp = getJwtExp(token);
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp <= (now + skewSeconds);
}

export function clearStoredRefreshToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('refresh');
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  setAccessToken(null);
  localStorage.removeItem('access_token');
  localStorage.removeItem('accessToken');
  clearStoredRefreshToken();
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
  localStorage.removeItem(REFRESH_COOKIE_FLAG);
  localStorage.removeItem(REFRESH_COOKIE_SET_AT);
  localStorage.removeItem(REFRESH_COOKIE_MAX_AGE);
}
