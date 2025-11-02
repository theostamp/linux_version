// frontend/lib/apiPublic.ts
import axios from 'axios';
import { ensureApiUrl, getDefaultRemoteApiUrl, isLocalHostname } from '@/lib/apiBase';

const FALLBACK_PUBLIC_API_URL = getDefaultRemoteApiUrl();

// Helper function to get the correct API base URL based on hostname
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    console.log(`[API PUBLIC] Current hostname: ${hostname}`);
    
    // On Vercel (including custom domains), prefer same-origin '/api' to leverage rewrites
    // Check if we're on Vercel by looking at the VERCEL env var OR if hostname is vercel.app OR newconcierge.app
    const isVercelDeployment = hostname.includes('vercel.app') || 
                               hostname === 'newconcierge.app' || 
                               hostname.endsWith('.newconcierge.app') ||
                               (typeof process !== 'undefined' && process.env.VERCEL === '1');
    
    if (isVercelDeployment) {
      console.log('[API PUBLIC] Using same-origin /api via Vercel rewrites (custom domain detected)');
      return '/api';
    }
    
    // Αν είναι tenant subdomain (π.χ. demo.localhost), χρησιμοποιούμε το ίδιο subdomain για το API
    if (hostname.includes('.localhost') && !hostname.startsWith('localhost')) {
      const apiUrl = `http://${hostname}:18000/api`;
      console.log(`[API PUBLIC] Using tenant-specific API URL: ${apiUrl}`);
      return apiUrl;
    }
    
    // For localhost development, also use same-origin '/api' to match local reverse proxies
    if (isLocalHostname(hostname)) {
      console.log('[API PUBLIC] Using same-origin /api for local development');
      return '/api';
    }

    console.warn(
      `[API PUBLIC] NEXT_PUBLIC_API_URL missing for ${hostname}. Using fallback: ${FALLBACK_PUBLIC_API_URL}`
    );
    return FALLBACK_PUBLIC_API_URL;
  }
  // Server-side fallback logic
  const serverEnvUrl = ensureApiUrl(process.env.API_URL) || ensureApiUrl(process.env.NEXT_PUBLIC_API_URL);
  if (serverEnvUrl) {
    console.log(`[API PUBLIC] Using server-side API URL: ${serverEnvUrl}`);
    return serverEnvUrl;
  }

  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    console.warn('[API PUBLIC] API_URL not configured on server. Using fallback remote API URL.');
    return FALLBACK_PUBLIC_API_URL;
  }

  // Χρησιμοποιούμε το backend container name για το kiosk mode
  const defaultUrl = 'http://backend:8000/api';
  console.log(`[API PUBLIC] Using backend container API URL: ${defaultUrl}`);
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
