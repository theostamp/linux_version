export type TokenStorageOptions = {
  access?: string | null;
  refresh?: string | null;
  refreshCookieSet?: boolean;
  allowRefreshStorage?: boolean;
  allowAccessStorage?: boolean;
};

const REFRESH_COOKIE_FLAG = 'refresh_cookie_enabled';
let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window === 'undefined') return null;
  if (isRefreshCookieEnabled()) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('access');
    localStorage.removeItem('accessToken');
    return null;
  }
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
  return localStorage.getItem(REFRESH_COOKIE_FLAG) === '1';
}

export function setRefreshCookieEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(REFRESH_COOKIE_FLAG, '1');
  } else {
    localStorage.removeItem(REFRESH_COOKIE_FLAG);
  }
}

export function storeAuthTokens(options: TokenStorageOptions): void {
  if (typeof window === 'undefined') return;
  const {
    access,
    refresh,
    refreshCookieSet = false,
    allowRefreshStorage,
    allowAccessStorage,
  } = options;

  if (access) {
    setAccessToken(access);
    const shouldStoreAccess =
      allowAccessStorage === true || (!refreshCookieSet && allowAccessStorage !== false);
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
    setRefreshCookieEnabled(true);
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

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  setAccessToken(null);
  localStorage.removeItem('access_token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
  localStorage.removeItem(REFRESH_COOKIE_FLAG);
}
