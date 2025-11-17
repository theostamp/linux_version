import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, extractResults, getActiveBuildingId, type Offer } from '@/lib/api';

interface UseOffersOptions {
  buildingId?: number | null;
  projectId?: string | number | null;
  status?: string;
  pageSize?: number;
}

export function useOffers(options: UseOffersOptions = {}) {
  const { buildingId, projectId, status, pageSize = 1000 } = options;
  const activeBuildingId = buildingId ?? getActiveBuildingId();

  const queryKey = ['offers', { building: activeBuildingId, project: projectId, status }];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, any> = {
        page_size: pageSize,
      };
      
      if (activeBuildingId) {
        params.building = activeBuildingId;
      }
      
      if (projectId) {
        params.project = projectId;
      }
      
      if (status) {
        params.status = status;
      }
      
      const response = await api.get('/projects/offers/', { params });
      return response.data;
    },
    enabled: Boolean(activeBuildingId || projectId),
  });

  const offers = extractResults<Offer>(query.data ?? []);

  return {
    offers,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useOffer(offerId: string | number | null) {
  return useQuery({
    queryKey: ['offer', offerId],
    queryFn: async () => {
      if (!offerId) return null;
      const response = await api.get(`/projects/offers/${offerId}/`);
      return response.data;
    },
    enabled: Boolean(offerId),
  });
}

export function useOfferMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Offer>) => {
      const response = await api.post('/projects/offers/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (offerId: string | number) => {
      const response = await api.post(`/projects/offers/${offerId}/approve/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ offerId, notes }: { offerId: string | number; notes?: string }) => {
      const response = await api.post(`/projects/offers/${offerId}/reject/`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<Offer> }) => {
      const response = await api.patch(`/projects/offers/${id}/`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['offer', variables.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/projects/offers/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    create: createMutation,
    approve: approveMutation,
    reject: rejectMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}


