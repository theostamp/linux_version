import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ResidentSearchResult {
  name: string;
  role: 'owner' | 'tenant';
  building_id: number;
  building_name: string;
  apartment_number: string;
  email?: string | null;
  phone?: string | null;
}

export interface ResidentSearchResponse {
  results: ResidentSearchResult[];
}

async function fetchResidents(query: string, limit: number): Promise<ResidentSearchResponse> {
  return api.get('/office-analytics/residents/', { query, limit });
}

export function useOfficeResidentSearch(query: string, limit = 20) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['office-residents', trimmed, limit],
    queryFn: () => fetchResidents(trimmed, limit),
    enabled: trimmed.length >= 2,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export default useOfficeResidentSearch;
