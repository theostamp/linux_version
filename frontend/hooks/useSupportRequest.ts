// frontend/hooks/useSupportRequest.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleSupportRequest } from '@/lib/api'; // ✅ Σωστό import

export function useSupportRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toggleSupportRequest(id), // ✅ σωστό όνομα
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', id] });
    },
  });
}
