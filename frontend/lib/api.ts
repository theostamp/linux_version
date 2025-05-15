// Helper για όλα τα calls στο backend
import axios, { AxiosResponse } from 'axios';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/* ------------------------------------------------------------------ */
/* 1.  Αυτόματος Authorization header από localStorage                 */
/* ------------------------------------------------------------------ */
api.interceptors.request.use((config) => {
  const access = (typeof window !== 'undefined') ? localStorage.getItem('access') : null;

  if (!config.headers) config.headers = {} as import('axios').AxiosRequestHeaders;

  // ⬇️ Authorization για όλα εκτός login
  if (access && !config.url?.includes('/users/login/')) {
    config.headers.Authorization = `Bearer ${access}`;
  }

  // ⬇️ Host header για να επιλέξει σωστά tenant
  // config.headers.Host = window.location.hostname;
  

  return config;
});


/* ------------------------------------------------------------------ */
/* 2.  CSRF token για state-changing requests (αν χρειάζεται)          */
/* ------------------------------------------------------------------ */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const regex = new RegExp('(^| )' + name + '=([^;]+)');
  const m = regex.exec(document.cookie);
  return m ? decodeURIComponent(m[2]) : null;
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? '').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = getCookie('csrftoken');
    if (csrf) config.headers['X-CSRFToken'] = csrf;
  }
  return config;
});

/* ==================================================================
   ΔΕΔΟΜΕΝΑ / TYPES
   ================================================================== */
export type User = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
};

/* ------------------------------------------------------------------
   AUTH
   ------------------------------------------------------------------ */
export async function loginUser(
  email: string,
  password: string,
): Promise<{ access: string; refresh: string; user: User }> {
  const { data } = await api.post('/users/login/', { email, password });

  // — Αποθήκευση των tokens στο localStorage —
  if (typeof window !== 'undefined') {
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    console.log('[loginUser] saved tokens:', {
      access: data.access.slice(0, 10) + '…',
      refresh: data.refresh.slice(0, 10) + '…',
    });
  }

  return data;
}

/** Αποσύνδεση: στέλνει το refresh token στον server για blacklist */
export async function logoutUser(): Promise<void> {
  const refresh = (typeof window !== 'undefined')
    ? localStorage.getItem('refresh')
    : null;
  await api.post('/users/logout/', { refresh });
  // (προαιρετικά: καθάρισμα localStorage εδώ ή στο Context)
}

/** Παίρνει τα στοιχεία του τρέχοντος χρήστη */
export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/users/me/');
  return data;
}


/* ------------------------------------------------------------------
   (τα υπόλοιπα helper‐functions: buildings, votes, … παραμένουν όπως
   τα είχες – τα έκοψα για συντομία)
   ------------------------------------------------------------------ */

// -----------------------------------------------------------------------------
// ΤΥΠΟΙ ΔΕΔΟΜΕΝΩΝ
// -----------------------------------------------------------------------------
export type Building = { id: number; name: string; address: string; city: string; postal_code: string; apartments_count?: number; internal_manager_name?: string; internal_manager_phone?: string; created_at: string; updated_at: string; };
export type Announcement = { id: number; title: string; description: string; file: string | null; start_date: string; end_date: string; is_active: boolean; created_at: string; };
export type Vote = { id: number; title: string; description: string; start_date: string; end_date: string; };
export type VoteSubmission = { choice: 'ΝΑΙ' | 'ΟΧΙ' | 'ΛΕΥΚΟ' | null; };
export type VoteResultsData = { ΝΑΙ: number; ΟΧΙ: number; ΛΕΥΚΟ: number; total: number; };
export type UserRequest = { id: number; title: string; description: string; status: string; created_at: string; updated_at?: string; created_by?: number; created_by_username: string; supporter_count: number; supporter_usernames?: string[]; is_urgent: boolean; type?: string; };

// -----------------------------------------------------------------------------
// API CALLS - BUILDINGS
// -----------------------------------------------------------------------------
export async function fetchBuildings(): Promise<Building[]> {
  const resp = await api.get<{ results?: Building[] } | Building[]>('/buildings/');
  const data = resp.data;
  const rows: Building[] = Array.isArray(data) ? data : data.results ?? [];
  return rows;
}

export async function fetchBuilding(id: number): Promise<Building> {
  const { data } = await api.get<Building>(`/buildings/${id}/`);
  return data;
}

export async function createBuilding(payload: Partial<Building>): Promise<Building> {
  const { data } = await api.post<Building>('/buildings/', payload);
  return data;
}

export async function updateBuilding(id: number, payload: Partial<Building>): Promise<Building> {
  const { data } = await api.put<Building>(`/buildings/${id}/`, payload);
  return data;
}

export async function deleteBuilding(id: number): Promise<void> {
  await api.delete(`/buildings/${id}/`);
}

// -----------------------------------------------------------------------------
// API CALLS - ANNOUNCEMENTS
// -----------------------------------------------------------------------------
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const resp: AxiosResponse<{ results?: any[] } | any[]> = await api.get('/announcements/');
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
    created_at: row.created_at,
  }));
}

export async function createAnnouncement(payload: { title: string; description: string; start_date: string; end_date: string; file?: string | null; }): Promise<void> {
  await api.post('/announcements/', payload);
}

// -----------------------------------------------------------------------------
// API CALLS - VOTES
// -----------------------------------------------------------------------------
export async function fetchVotes(): Promise<Vote[]> {
  const resp: AxiosResponse<{ results?: Vote[] } | Vote[]> = await api.get('/votes/');
  const data = resp.data;
  const rows: Vote[] = Array.isArray(data) ? data : data.results ?? [];
  return rows;
}

export async function fetchMyVote(voteId: number): Promise<VoteSubmission> {
  const { data } = await api.get<VoteSubmission>(`/votes/${voteId}/my-submission/`);
  return data;
}

export async function submitVote(voteId: number, choice: 'ΝΑΙ' | 'ΟΧΙ' | 'ΛΕΥΚΟ'): Promise<void> {
  await api.post(`/votes/${voteId}/vote/`, { choice });
}

export async function fetchVoteResults(voteId: number): Promise<VoteResultsData> {
  const { data } = await api.get<VoteResultsData>(`/votes/${voteId}/results/`);
  return data;
}

export interface CreateVotePayload { title: string; description: string; start_date: string; end_date?: string; choices: string[]; building: number; }
export async function createVote(payload: CreateVotePayload): Promise<void> {
  await api.post('/votes/', payload);
}

// -----------------------------------------------------------------------------
// API CALLS - USER REQUESTS
// -----------------------------------------------------------------------------
export async function fetchRequests(status: string = ''): Promise<UserRequest[]> {
  const url = status ? `/user-requests/?status=${encodeURIComponent(status)}` : '/user-requests/';
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
    supporter_count: r.supporter_count ?? 0,
    supporter_usernames: r.supporter_usernames ?? [],
    is_urgent: r.is_urgent ?? false,
    type: r.type ?? '',
  }));
}

export async function fetchTopRequests(): Promise<UserRequest[]> {
  const resp: AxiosResponse<{ results?: any[] } | any[]> = await api.get('/user-requests/top/');
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
    supporter_count: r.supporter_count ?? 0,
    supporter_usernames: r.supporter_usernames ?? [],
    is_urgent: r.is_urgent ?? false,
    type: r.type ?? '',
  }));
}

export async function toggleSupportRequest(id: number): Promise<{ status: string }> {
  const { data } = await api.post(`/user-requests/${id}/support/`);
  return data;
}

export async function createUserRequest(payload: { title: string; description: string; building?: number; type?: string; is_urgent?: boolean; }): Promise<void> {
  await api.post('/user-requests/', payload);
}
export async function updateUserRequest(id: number, payload: { title: string; description: string; building?: number; type?: string; is_urgent?: boolean; }): Promise<void> {
  await api.put(`/user-requests/${id}/`, payload);
}

