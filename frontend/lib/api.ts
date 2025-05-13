// frontend/lib/api.ts
// Βοηθητικό αρχείο για κλήσεις στο backend API

import axios, { AxiosResponse } from 'axios';

// -----------------------------------------------------------------------------
// Proxy μέσω Next.js: όλα τα /api/** περνάνε στο backend (rewrites στο next.config.js)
// -----------------------------------------------------------------------------
export const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// CSRF Interceptor: προσθέτει X-CSRFToken από cookie σε state-changing requests
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

api.interceptors.request.use((config) => {
  const method = (config.method || '').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = getCookie('csrftoken');
    if (csrf) config.headers!['X-CSRFToken'] = csrf;
  }
  return config;
});

// -----------------------------------------------------------------------------
// ΤΥΠΟΙ ΔΕΔΟΜΕΝΩΝ
// -----------------------------------------------------------------------------
export type Building = { id: number; name: string; address: string; city: string; postal_code: string; apartments_count?: number; internal_manager_name?: string; internal_manager_phone?: string; created_at: string; updated_at: string; };
export type Announcement = { id: number; title: string; description: string; file: string | null; start_date: string; end_date: string; is_active: boolean; created_at: string; };
export type Vote = { id: number; title: string; description: string; start_date: string; end_date: string; };
export type VoteSubmission = { choice: 'ΝΑΙ' | 'ΟΧΙ' | 'ΛΕΥΚΟ' | null; };
export type VoteResultsData = { ΝΑΙ: number; ΟΧΙ: number; ΛΕΥΚΟ: number; total: number; };
export type UserRequest = { id: number; title: string; description: string; status: string; created_at: string; updated_at?: string; created_by?: number; created_by_username: string; supporter_count: number; supporter_usernames?: string[]; is_urgent: boolean; type?: string; };
export type User = { id: number; username: string; email?: string; first_name?: string; last_name?: string; };

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
    description: row.description || row.content || '',
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

// -----------------------------------------------------------------------------
// API CALLS - AUTH
// -----------------------------------------------------------------------------
export async function loginUser(username: string, password: string): Promise<void> {
  await api.post('/users/login/', { username, password });
}

export async function logoutUser(): Promise<void> {
  await api.post('/users/logout/');
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/users/me/');
  return data;
}
