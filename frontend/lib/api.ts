// Helper για όλα τα calls στο backend
import axios, { AxiosResponse, AxiosRequestHeaders, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { UserRequest } from '@/types/userRequests';
export type { UserRequest };
import type { User } from '@/types/user';




// Βασικό URL του API. Προσαρμόστε το NEXT_PUBLIC_API_URL στο .env.local ή .env.production
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8000/api'; // Default για τοπική ανάπτυξη

export const api = axios.create({
  baseURL: typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000/api`
    : 'http://localhost:8000/api',
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
  created_at: string; updated_at?: string;
};

export type Vote = { 
  id: number; title: string; description: string; start_date: string; end_date: string; 
  building: number; // Building ID
  choices?: string[]; is_active?: boolean; created_at?: string; updated_at?: string;
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
  created_at: string;
  updated_at?: string;
  // Add other fields as needed based on your backend model
};

export async function fetchBuildings(): Promise<Building[]> {
  console.log('[API CALL] Attempting to fetch /buildings/');
  const resp = await api.get<{ results?: Building[] } | Building[]>('/buildings/');
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchBuilding(id: number): Promise<Building> {
  console.log(`[API CALL] Attempting to fetch /buildings/${id}/`);
  const { data } = await api.get<Building>(`/buildings/${id}/`);
  return data;
}

// Type alias for building creation/update payload
export type BuildingPayload = Partial<Omit<Building, 'id' | 'created_at' | 'updated_at'>>;

export async function createBuilding(payload: BuildingPayload): Promise<Building> {
  console.log('[API CALL] Attempting to create building:', payload);
  const { data } = await api.post<Building>('/buildings/', payload);
  return data;
}

export async function updateBuilding(id: number, payload: BuildingPayload): Promise<Building> {
  console.log(`[API CALL] Attempting to update building ${id}:`, payload);
  const { data } = await api.put<Building>(`/buildings/${id}/`, payload);
  return data;
}

export async function deleteBuilding(id: number): Promise<void> {
  console.log(`[API CALL] Attempting to delete building ${id}`);
  await api.delete(`/buildings/${id}/`);
}

export async function fetchAnnouncements(buildingId?: number): Promise<Announcement[]> {
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
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active,
      building: row.building,
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
export interface CreateAnnouncementPayload { 
  title: string; description: string; start_date: string; end_date: string; 
  file?: File | null; building: number; is_active?: boolean; 
}
export async function createAnnouncement(payload: CreateAnnouncementPayload): Promise<Announcement> {
  console.log('[API CALL] Attempting to create announcement:', payload.file ? 'with file' : 'without file');
  if (payload.file && payload.file instanceof File) {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('start_date', payload.start_date);
    formData.append('end_date', payload.end_date);
    formData.append('building', String(payload.building));
    if (payload.is_active !== undefined) formData.append('is_active', String(payload.is_active));
    formData.append('file', payload.file, payload.file.name);
    const { data } = await api.post<Announcement>('/announcements/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } else {
    const jsonData: any = { ...payload };
    if (payload.file === null || payload.file === undefined) delete jsonData.file;
    const { data } = await api.post<Announcement>('/announcements/', jsonData);
    return data;
  }
}

export async function fetchVotes(buildingId?: number): Promise<Vote[]> {
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

export interface CreateVotePayload { 
  title: string; description: string; start_date: string; 
  end_date?: string; choices: string[]; building: number; 
}
export async function createVote(payload: CreateVotePayload): Promise<Vote> {
  console.log('[API CALL] Attempting to create vote:', payload);
  const { data } = await api.post<Vote>('/votes/', payload);
  return data;
}

export interface PublicInfoData {
  announcements: Announcement[];
  votes: Vote[];
}

export async function fetchPublicInfo(buildingId: number): Promise<PublicInfoData> {
  const { data } = await api.get<PublicInfoData>(`/public-info/${buildingId}/`);
  return data;
}
export async function fetchRequests(filters: { status?: string; buildingId?: number } = {}): Promise<UserRequest[]> {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.buildingId) params.append('building', String(filters.buildingId));
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
    is_urgent: r.is_urgent ?? false,
    type: r.type ?? '',
    supporters: r.supporters ?? [],
  }));
}

export async function fetchTopRequests(buildingId: number): Promise<UserRequest[]> {
  const url = `/user-requests/top/?building=${buildingId}`;
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
    is_urgent: r.is_urgent ?? false,
    type: r.type ?? '',
    is_supported: r.is_supported ?? false,
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
    is_urgent: r.is_urgent ?? false,
    type: r.type ?? '',
    is_supported: r.is_supported ?? false,
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
}
export async function createUserRequest(payload: CreateUserRequestPayload): Promise<UserRequest> {
  console.log('[API CALL] Attempting to create user request:', payload);
  const { data } = await api.post<UserRequest>('/user-requests/', payload);
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
    const { data } = await axios.post<{ access: string }>('/users/token/refresh/', { refresh }, {
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('access', data.access);
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
    handleLogout('[handleTokenRefresh] Token refresh failed. Logging out.');
    processQueue(refreshError, null);
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
    // Optionally, redirect to login page:
    // window.location.href = '/login';
  }
}

// Νέα συνάρτηση για την ανάκτηση των κατοίκων ενός κτιρίου
export async function fetchResidents(buildingId: number) {
  const response = await api.get(`/buildings/memberships/?building=${buildingId}`);
  // Φιλτράρει μόνο όσους έχουν role === 'resident'
  return Array.isArray(response.data)
    ? response.data.filter((m) => m.role === 'resident')
    : [];
}

// ...μέσα στη handleTokenRefresh, αμέσως μετά το localStorage.setItem('access', data.access);

if (typeof window !== "undefined") {
  // Next.js App Router: soft reload
  import("next/navigation").then(({ useRouter }) => {
    // ΠΡΟΣΟΧΗ: useRouter είναι hook, δεν μπορεί να κληθεί εκτός component.
    // Εναλλακτικά, κάνε:
    // window.location.reload(); // fallback αν δεν έχεις πρόσβαση σε router instance
  });
}
