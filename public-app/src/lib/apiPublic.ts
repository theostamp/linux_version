// frontend/lib/apiPublic.ts
import axios from 'axios';

// Helper function to get the correct API base URL based on hostname
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname, origin, protocol, port } = window.location;
    console.log(`[API PUBLIC] Current hostname: ${hostname}, origin: ${origin}`);
    
    // Αν είναι tenant subdomain (π.χ. demo.localhost), χρησιμοποιούμε το ίδιο subdomain για το API
    if (hostname.includes('.localhost') && !hostname.startsWith('localhost')) {
      const apiUrl = `http://${hostname}:18000/api`;
      console.log(`[API PUBLIC] Using tenant-specific API URL: ${apiUrl}`);
      return apiUrl;
    }

    // Σε production, πάντα χρησιμοποιούμε το same-origin URL (HTTPS)
    const baseOrigin = origin && origin !== 'null'
      ? origin.replace(/\/$/, '')
      : `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    const sameOriginUrl = `${baseOrigin}/api`;
    console.log(`[API PUBLIC] Using same-origin API URL: ${sameOriginUrl}`);
    return sameOriginUrl;
  }

  // Server-side: χρησιμοποιούμε environment variables
  const envUrl =
    process.env.NEXT_PUBLIC_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_BASE_URL ||
    process.env.BACKEND_URL;

  if (envUrl) {
    const trimmed = envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
    const apiUrl = trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    console.log(`[API PUBLIC] Using environment API URL: ${apiUrl}`);
    return apiUrl;
  }

  // Server-side fallback (μόνο για SSR, όχι για browser)
  const defaultUrl = 'http://backend:8000/api';
  console.warn(`[API PUBLIC] Server-side fallback to backend container API URL: ${defaultUrl}`);
  return defaultUrl;
};

export const apiPublic = axios.create({
  baseURL: getApiBaseUrl(),
});

export const fetchPublicInfo = async (buildingId: number) => {
  try {
    const response = await apiPublic.get(`/public-info/${buildingId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch public info:', error);
    throw error;
  }
};

// ---------------------
// Public Maintenance API
// ---------------------
export type PublicScheduledMaintenance = {
  id: number;
  title: string;
  scheduled_date?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  building_name?: string;
  contractor_name?: string | null;
};

export async function fetchPublicScheduledMaintenance(params: { building: number; priority?: string; status?: string; ordering?: string } ): Promise<PublicScheduledMaintenance[]> {
  const search = new URLSearchParams();
  search.append('building', String(params.building));
  if (params.priority) search.append('priority', params.priority);
  if (params.status) search.append('status', params.status);
  if (params.ordering) search.append('ordering', params.ordering);

  const url = `/maintenance/public/scheduled/?${search.toString()}`;
  const resp = await apiPublic.get(url);
  const data = resp.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchPublicMaintenanceCounters(building: number): Promise<{
  scheduled_total: number;
  urgent_total: number;
  pending_receipts: number;
  active_contractors: number;
}> {
  const search = new URLSearchParams({ building: String(building) });
  const url = `/maintenance/public/counters/?${search.toString()}`;
  const resp = await apiPublic.get(url);
  return resp.data;
}

// ---------------------
// Public Projects API
// ---------------------
export type PublicProject = {
  id: number;
  title: string;
  status: 'awarded' | 'in_progress';
  start_date?: string | null;
  end_date?: string | null;
};

export async function fetchPublicProjects(building: number): Promise<PublicProject[]> {
  const search = new URLSearchParams({ building: String(building) });
  const url = `/projects/public/approved-in-progress/?${search.toString()}`;
  const resp = await apiPublic.get(url);
  return Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
}