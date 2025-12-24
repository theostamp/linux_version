'use client';

import { useQuery } from '@tanstack/react-query';
import { api, extractResults, getActiveBuildingId, type Paginated } from '@/lib/api';

export type MarketplaceProvider = {
  id: string;
  name: string;
  service_type: string;
  service_type_display: string;
  rating: string | number;
  phone: string;
  email: string;
  website: string;
  address: string;
  is_verified: boolean;
  is_featured: boolean;
  short_description: string;
  detailed_description: string;
  special_offers: string;
  coupon_code: string;
  coupon_description: string;
  portfolio_links: string[];
  distance_km?: number | null;
};

type UseMarketplaceProvidersOptions = {
  buildingId?: number | null;
  serviceType?: string;
  search?: string;
  maxDistanceKm?: number | null;
};

export function useMarketplaceProviders(options: UseMarketplaceProvidersOptions = {}) {
  const {
    buildingId,
    serviceType,
    search,
    maxDistanceKm,
  } = options;

  const activeBuildingId = buildingId ?? getActiveBuildingId();

  const query = useQuery({
    queryKey: ['marketplace-providers', { building: activeBuildingId, serviceType, search, maxDistanceKm }],
    queryFn: async () => {
      const params: Record<string, any> = {};

      if (activeBuildingId) params.building_id = activeBuildingId;
      if (serviceType) params.service_type = serviceType;
      if (search) params.search = search;
      if (maxDistanceKm) params.max_distance_km = maxDistanceKm;

      const response = await api.get<Paginated<MarketplaceProvider>>('/marketplace/providers/', { params });
      return response;
    },
    enabled: Boolean(activeBuildingId),
  });

  const providers = extractResults<MarketplaceProvider>((query.data ?? []) as any);

  return {
    providers,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useMarketplaceProvider(id: string | null, buildingId?: number | null) {
  const activeBuildingId = buildingId ?? getActiveBuildingId();

  return useQuery({
    queryKey: ['marketplace-provider', id, { building: activeBuildingId }],
    queryFn: async () => {
      if (!id) return null;
      const params: Record<string, any> = {};
      if (activeBuildingId) params.building_id = activeBuildingId;
      return await api.get<MarketplaceProvider>(`/marketplace/providers/${id}/`, { params });
    },
    enabled: Boolean(id),
  });
}


