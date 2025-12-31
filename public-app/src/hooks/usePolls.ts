'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface PollOption {
  id: string;
  text: string;
  order: number;
}

export interface CommunityPoll {
  id: string;
  building: number;
  title: string;
  description: string;
  author: number;
  author_name: string;
  is_active: boolean;
  allow_multiple_choices: boolean;
  expires_at: string | null;
  is_expired: boolean;
  options: PollOption[];
  vote_count: number;
  has_voted: boolean;
  created_at: string;
}

export function usePolls(buildingId?: number | null) {
  return useQuery<CommunityPoll[]>({
    queryKey: ['community-polls', buildingId],
    queryFn: async () => {
      const url = buildingId ? `/assemblies/community-polls/?building=${buildingId}` : '/assemblies/community-polls/';
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!buildingId,
  });
}

export function usePoll(pollId: string) {
  return useQuery<CommunityPoll>({
    queryKey: ['community-poll', pollId],
    queryFn: async () => {
      const response = await api.get(`/assemblies/community-polls/${pollId}/`);
      return response.data;
    },
    enabled: !!pollId,
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/assemblies/community-polls/', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-polls'] });
      toast.success('Η δημοσκόπηση δημιουργήθηκε');
    },
  });
}

export function useVoteInPoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      const response = await api.post(`/assemblies/community-polls/${pollId}/vote/`, { option_id: optionId });
      return response.data;
    },
    onSuccess: (_, { pollId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-polls'] });
      queryClient.invalidateQueries({ queryKey: ['community-poll', pollId] });
      toast.success('Η ψήφος σας καταχωρήθηκε');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Σφάλμα κατά την ψηφοφορία');
    }
  });
}


















