// frontend/lib/api/fetchAnnouncements.ts

import { API_BASE_URL } from '../api';

export async function fetchAnnouncements() {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/announcements/`, {
    method: 'GET',
    headers,
  });

  if (res.status === 401) {
    // Άκυρο token: καθάρισε το και ίσως κάνε redirect στο login
    localStorage.removeItem('accessToken');
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? `Σφάλμα ${res.status}`);
  }

  return res.json();
}
