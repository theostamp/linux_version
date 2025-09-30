/**
 * React Query hooks for notifications
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';
import type { NotificationCreateRequest } from '@/types/notifications';
import { toast } from 'sonner';

/**
 * Query keys
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: number) => [...notificationKeys.details(), id] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
};

/**
 * Get all notifications
 */
export function useNotifications(params?: {
  status?: string;
  notification_type?: string;
  priority?: string;
  building?: number;
}) {
  return useQuery({
    queryKey: notificationKeys.list(params || {}),
    queryFn: () => notificationsApi.list(params),
  });
}

/**
 * Get notification by ID
 */
export function useNotification(id: number) {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationsApi.get(id),
    enabled: !!id,
  });
}

/**
 * Get notification statistics
 */
export function useNotificationStats() {
  return useQuery({
    queryKey: notificationKeys.stats(),
    queryFn: () => notificationsApi.stats(),
  });
}

/**
 * Create and send notification
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NotificationCreateRequest) =>
      notificationsApi.create(data),
    onSuccess: (data) => {
      // Invalidate notifications list
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });

      // Show success message
      if (data.status === 'sent') {
        toast.success(
          `Ειδοποίηση στάλθηκε σε ${data.total_recipients} παραλήπτες`,
          {
            description: `✅ ${data.successful_sends} επιτυχείς, ❌ ${data.failed_sends} αποτυχίες`,
          }
        );
      } else {
        toast.success('Ειδοποίηση προγραμματίστηκε', {
          description: `Θα σταλεί στις ${new Date(
            data.scheduled_at!
          ).toLocaleString('el-GR')}`,
        });
      }
    },
    onError: (error: any) => {
      toast.error('Αποτυχία αποστολής ειδοποίησης', {
        description: error.response?.data?.detail || error.message,
      });
    },
  });
}

/**
 * Resend failed notifications
 */
export function useResendNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationsApi.resend(id),
    onSuccess: (data, id) => {
      // Invalidate notification detail
      queryClient.invalidateQueries({ queryKey: notificationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });

      // Show success message
      toast.success('Επαναποστολή ολοκληρώθηκε', {
        description: `✅ ${data.resent} επιτυχείς, ❌ ${data.failed} αποτυχίες`,
      });
    },
    onError: (error: any) => {
      toast.error('Αποτυχία επαναποστολής', {
        description: error.response?.data?.detail || error.message,
      });
    },
  });
}