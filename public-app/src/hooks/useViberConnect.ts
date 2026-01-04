'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type ViberSubscriptionStatus = {
  configured: boolean;
  is_subscribed: boolean;
  viber_name?: string;
  viber_user_id?: string;
  subscribed_at?: string;
  unsubscribed_at?: string | null;
};

type ViberLinkResponse = {
  configured: boolean;
  link_url?: string;
  web_url?: string;
  chat_uri?: string;
  expires_in?: number;
};

export function useViberConnect() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<ViberSubscriptionStatus>({
    queryKey: ['viber-subscription'],
    queryFn: () => api.get('/notifications/viber/subscription/'),
  });

  const connectMutation = useMutation({
    mutationFn: async (): Promise<ViberLinkResponse> => api.get('/notifications/viber/link/'),
    onSuccess: (data) => {
      const target = data.link_url || data.web_url || '';
      if (target && typeof window !== 'undefined') {
        window.location.href = target;
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (): Promise<{ message?: string }> =>
      api.delete('/notifications/viber/subscription/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viber-subscription'] });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error as Error | null,
    connect: connectMutation.mutateAsync,
    disconnect: disconnectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    refresh: statusQuery.refetch,
  };
}

export default useViberConnect;
