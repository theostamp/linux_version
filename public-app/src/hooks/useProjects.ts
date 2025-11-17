import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, extractResults, getActiveBuildingId, type Project } from '@/lib/api';

interface UseProjectsOptions {
  buildingId?: number | null;
  status?: string;
  pageSize?: number;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { buildingId, status, pageSize = 1000 } = options;
  const activeBuildingId = buildingId ?? getActiveBuildingId();

  const queryKey = ['projects', { building: activeBuildingId, status }];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!activeBuildingId) return { results: [], count: 0 };
      
      const params: Record<string, any> = {
        building: activeBuildingId,
        page_size: pageSize,
      };
      
      if (status) {
        params.status = status;
      }
      
      const response = await api.get('/projects/projects/', { params });
      return response.data;
    },
    enabled: Boolean(activeBuildingId),
  });

  const projects = extractResults<Project>(query.data ?? []);

  return {
    projects,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useProject(projectId: string | number | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const response = await api.get(`/projects/projects/${projectId}/`);
      return response.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useProjectMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const response = await api.post('/projects/projects/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<Project> }) => {
      const response = await api.patch(`/projects/projects/${id}/`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/projects/projects/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}


