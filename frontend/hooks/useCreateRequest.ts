// frontend/hooks/useCreateRequest.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUserRequest } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';

export function useCreateRequest() {
  const queryClient = useQueryClient();
  const { currentBuilding } = useBuilding();

  return useMutation({
    mutationFn: createUserRequest,
    onSuccess: () => {
      if (currentBuilding?.id) {
        queryClient.invalidateQueries({ queryKey: ['requests', currentBuilding.id] });
        queryClient.invalidateQueries({ queryKey: ['top-requests', currentBuilding.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['requests'] });
      }
    },
  });
}
