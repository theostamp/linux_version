'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Service type choices from backend
export const SERVICE_TYPE_CHOICES = [
  { value: 'repair', label: 'Επισκευές' },
  { value: 'cleaning', label: 'Καθαριότητα' },
  { value: 'security', label: 'Ασφάλεια' },
  { value: 'electrical', label: 'Ηλεκτρολογικά' },
  { value: 'plumbing', label: 'Υδραυλικά' },
  { value: 'heating', label: 'Θέρμανση/Κλιματισμός' },
  { value: 'elevator', label: 'Ανελκυστήρες' },
  { value: 'landscaping', label: 'Κηπουρική' },
  { value: 'painting', label: 'Βαψίματα' },
  { value: 'carpentry', label: 'Ξυλουργική' },
  { value: 'masonry', label: 'Κατασκευές' },
  { value: 'technical', label: 'Τεχνικές Υπηρεσίες' },
  { value: 'maintenance', label: 'Συντήρηση' },
  { value: 'emergency', label: 'Επείγοντα' },
  { value: 'other', label: 'Άλλο' },
] as const;

export type ServiceType = typeof SERVICE_TYPE_CHOICES[number]['value'];

export interface MarketplaceProvider {
  id: string;
  name: string;
  service_type: ServiceType;
  service_type_display?: string;
  rating: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  is_active: boolean;
  show_in_marketplace: boolean;
  is_verified: boolean;
  is_featured: boolean;
  short_description: string;
  detailed_description: string;
  special_offers: string;
  coupon_code: string;
  coupon_description: string;
  portfolio_links: string[];
  latitude: string | null;
  longitude: string | null;
  is_nationwide: boolean;
  service_radius_km: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProviderInput {
  name: string;
  service_type: ServiceType;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  is_active?: boolean;
  show_in_marketplace?: boolean;
  is_verified?: boolean;
  is_featured?: boolean;
  short_description?: string;
  detailed_description?: string;
  special_offers?: string;
  coupon_code?: string;
  coupon_description?: string;
  portfolio_links?: string[];
  latitude?: string | null;
  longitude?: string | null;
  is_nationwide?: boolean;
  service_radius_km?: string | null;
  rating?: string;
}

export type UpdateProviderInput = Partial<CreateProviderInput>;

const QUERY_KEY = 'marketplace-providers-admin';

/**
 * Hook for admin CRUD operations on Marketplace Providers.
 * Requires Ultra Admin permissions.
 */
export function useMarketplaceAdmin() {
  const queryClient = useQueryClient();

  // Fetch all providers (including inactive ones for admin)
  const providersQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<MarketplaceProvider[]> => {
      const response = await api.get('/marketplace/providers/');
      return response.data;
    },
  });

  // Create a new provider
  const createMutation = useMutation({
    mutationFn: async (data: CreateProviderInput): Promise<MarketplaceProvider> => {
      const response = await api.post('/marketplace/providers/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Update an existing provider
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: UpdateProviderInput
    }): Promise<MarketplaceProvider> => {
      const response = await api.patch(`/marketplace/providers/${id}/`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Delete a provider
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/marketplace/providers/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    providers: providersQuery.data || [],
    isLoading: providersQuery.isLoading,
    isError: providersQuery.isError,
    error: providersQuery.error,
    refetch: providersQuery.refetch,

    createProvider: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateProvider: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteProvider: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
