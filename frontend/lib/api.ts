// frontend/lib/api.ts
// Βοηθητικό αρχείο για κλήσεις στο backend API

import axios from 'axios';
import { getBaseUrl } from '@/lib/config';

// Βασικό URL για το API (env-var override)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? getBaseUrl();
console.log('✅ API_BASE_URL =', API_BASE_URL);

// Axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/* =========================================================================
   ΤΥΠΟΙ ΔΕΔΟΜΕΝΩΝ
   ========================================================================= */
export type Building = {
  id: number;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  apartments_count?: number;
  internal_manager_name?: string;
  internal_manager_phone?: string;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  id: number;
  title: string;
  description: string;
  file: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export type Vote = {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
};

export type VoteSubmission = {
  choice: 'ΝΑΙ' | 'ΟΧΙ' | 'ΛΕΥΚΟ' | null;
};

export type VoteResultsData = {
  ΝΑΙ: number;
  ΟΧΙ: number;
  ΛΕΥΚΟ: number;
  total: number;
};

export type UserRequest = {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at?: string;
  created_by?: number;
  created_by_username: string;
  supporter_count: number;
  supporter_usernames?: string[];
  is_urgent: boolean;
  type?: string;
};

export type User = {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

/* =========================================================================
   ΒΟΗΘΗΤΙΚΕΣ ΣΥΝΑΡΤΗΣΕΙΣ
   ========================================================================= */
async function check(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export async function csrfFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = {
    ...(init.headers || {}),
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken') || '',
  };
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  }).then(check);
}

/* =========================================================================
   ΚΛΗΣΕΙΣ API - BUILDINGS
   ========================================================================= */
export async function fetchBuildings(): Promise<Building[]> {
  const response = await api.get<any>('/buildings/');
  const data = response.data;
  // Διαχείριση paginated ή απλού array
  if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
    return data.results as Building[];
  }
  if (Array.isArray(data)) {
    return data as Building[];
  }
  // Σε κάθε άλλη περίπτωση, επιστρέφουμε κενό πίνακα για αποφυγή σφαλμάτων
  return [];
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

/* =========================================================================
   ΚΛΗΣΕΙΣ API - ANNOUNCEMENTS
   ========================================================================= */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await fetch(`${API_BASE_URL}/announcements/`, {
    cache: 'no-store',
    credentials: 'include',
  }).then(check);
  const json = await res.json();
  const rows = Array.isArray(json.results) ? json.results : json;
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description || row.content || '',
    file: row.file || null,
    start_date: row.start_date,
    end_date: row.end_date,
    is_active: row.is_active,
    created_at: row.created_at,
  }));
}

export async function createAnnouncement(payload: {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  file?: string | null;
}) {
  await csrfFetch(`${API_BASE_URL}/announcements/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* =========================================================================
   ΚΛΗΣΕΙΣ API - VOTES
   ========================================================================= */
export async function fetchVotes(): Promise<Vote[]> {
  const res = await fetch(`${API_BASE_URL}/votes/`, {
    cache: 'no-store',
    credentials: 'include',
  }).then(check);
  const json = await res.json();
  const rows = Array.isArray(json.results) ? json.results : json;
  return rows.map((v: any) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    start_date: v.start_date,
    end_date: v.end_date,
  }));
}

export async function fetchMyVote(voteId: number): Promise<VoteSubmission> {
  const res = await fetch(`${API_BASE_URL}/votes/${voteId}/my-submission/`, { credentials: 'include' }).then(check);
  return res.json();
}

export async function submitVote(voteId: number, choice: 'ΝΑΙ' | 'ΟΧΙ' | 'ΛΕΥΚΟ'): Promise<void> {
  await csrfFetch(`${API_BASE_URL}/votes/${voteId}/vote/`, {
    method: 'POST',
    body: JSON.stringify({ choice }),
  });
}

export async function fetchVoteResults(voteId: number): Promise<VoteResultsData> {
  const res = await fetch(`${API_BASE_URL}/votes/${voteId}/results/`, { credentials: 'include' }).then(check);
  return res.json();
}

export interface CreateVotePayload {
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  choices: string[];
  building: number;
}

export async function createVote(payload: CreateVotePayload) {
  await csrfFetch(`${API_BASE_URL}/votes/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* =========================================================================
   ΚΛΗΣΕΙΣ API - USER REQUESTS
   ========================================================================= */
export async function fetchRequests(status: string = ''): Promise<UserRequest[]> {
  const url = new URL(`${API_BASE_URL}/user-requests/`);
  if (status) url.searchParams.append('status', status);
  const res = await fetch(url.toString(), { cache: 'no-store', credentials: 'include' }).then(check);
  const json = await res.json();
  const rows = Array.isArray(json.results) ? json.results : json;
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    created_by: r.created_by,
    created_by_username: r.created_by_username,
    supporter_count: r.supporter_count || 0,
    supporter_usernames: r.supporter_usernames || [],
    is_urgent: r.is_urgent || false,
    type: r.type || '',
  }));
}

export async function fetchTopRequests(): Promise<UserRequest[]> {
  const res = await fetch(`${API_BASE_URL}/user-requests/top/`, { cache: 'no-store', credentials: 'include' }).then(check);
  const json = await res.json();
  const rows = Array.isArray(json.results) ? json.results : json;
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    created_by: r.created_by,
    created_by_username: r.created_by_username,
    supporter_count: r.supporter_count || 0,
    supporter_usernames: r.supporter_usernames || [],
    is_urgent: r.is_urgent || false,
    type: r.type || '',
  }));
}

export async function toggleSupportRequest(id: number): Promise<{ status: string }> {
  const res = await csrfFetch(`${API_BASE_URL}/user-requests/${id}/support/`, { method: 'POST' });
  return res.json();
}

export async function createUserRequest(payload: {
  title: string;
  description: string;
  building?: number;
  type?: string;
  is_urgent?: boolean;
}) {
  await csrfFetch(`${API_BASE_URL}/user-requests/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* =========================================================================
   ΚΛΗΣΕΙΣ API - AUTH
   ========================================================================= */
export async function loginUser(username: string, password: string): Promise<void> {
  await csrfFetch(`${API_BASE_URL}/users/login/`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutUser(): Promise<void> {
  await csrfFetch(`${API_BASE_URL}/users/logout/`, { method: 'POST' });
}

export async function getCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/users/me/`, { credentials: 'include' }).then(check);
  return res.json();
}
