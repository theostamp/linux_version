'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MarketplacePartner {
  id: string;
  contractor: number;
  contractor_name: string;
  service_type: string;
  rating: string;
  phone: string;
  email: string;
  is_verified: boolean;
  is_featured: boolean;
  short_description: string;
  detailed_description: string;
  special_offers: string;
  portfolio_links: string[];
}

export function useMarketplacePartners(filters?: any) {
  return useQuery<MarketplacePartner[]>({
    queryKey: ['marketplace-partners', filters],
    queryFn: async () => {
      const response = await api.get('/maintenance/marketplace-partners/', { params: filters });
      return response.data;
    },
  });
}

export function useMarketplacePartner(id: string) {
  return useQuery<MarketplacePartner>({
    queryKey: ['marketplace-partner', id],
    queryFn: async () => {
      const response = await api.get(`/maintenance/marketplace-partners/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
}
