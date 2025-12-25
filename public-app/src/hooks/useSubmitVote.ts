'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitVote } from '@/lib/api';

export function useSubmitVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      voteId,
      option,
      buildingId,
      apartmentId,
    }: {
      voteId: number;
      option: string;
      buildingId?: number | null;
      apartmentId?: number | null;
    }) => submitVote(voteId, option, buildingId, apartmentId),
    onSuccess: async (_, { voteId }) => {
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['votes'] });
      await queryClient.invalidateQueries({ queryKey: ['vote', voteId] });
      await queryClient.invalidateQueries({ queryKey: ['myVote', voteId] });
      await queryClient.invalidateQueries({ queryKey: ['vote-results', voteId] });
      await queryClient.refetchQueries({ queryKey: ['votes'] });
      await queryClient.refetchQueries({ queryKey: ['vote', voteId] });
      await queryClient.refetchQueries({ queryKey: ['myVote', voteId] });
      await queryClient.refetchQueries({ queryKey: ['vote-results', voteId] });
    },
  });
}
