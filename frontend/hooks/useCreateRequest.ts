import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUserRequest } from '@/lib/api';

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUserRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}
