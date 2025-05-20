import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitVote } from '@/lib/api';

export function useSubmitVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ voteId, option }: { voteId: number; option: string }) =>
      submitVote(voteId, option),
    onSuccess: (_, { voteId }) => {
      queryClient.invalidateQueries({ queryKey: ['votes'] });
      queryClient.invalidateQueries({ queryKey: ['vote', voteId] });
      queryClient.invalidateQueries({ queryKey: ['my-vote', voteId] });
    },
  });
}
