'use client';

import { useCallback } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { TodoItem } from './useTodos';

// Types
export type NotificationType = 'due_soon' | 'overdue' | 'completed' | 'assigned' | 'reminder';

export interface TodoNotification {
  id: number;
  todo: number;
  todo_item?: TodoItem; // Nested todo data if included
  user: number;
  notification_type: NotificationType;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Query keys
export const todoNotificationKeys = {
  all: ['todoNotifications'] as const,
  lists: () => [...todoNotificationKeys.all, 'list'] as const,
  list: (filters?: { is_read?: boolean }) =>
    [...todoNotificationKeys.lists(), filters] as const,
  unreadCount: () => [...todoNotificationKeys.all, 'unreadCount'] as const,
};

/**
 * Hook for managing todo notifications/reminders
 */
export function useTodoNotifications(options?: { is_read?: boolean }) {
  const { selectedBuilding } = useBuilding();
  const queryClient = useQueryClient();
  const buildingId = selectedBuilding?.id;

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: todoNotificationKeys.list({ is_read: options?.is_read }),
    queryFn: async () => {
      const params: Record<string, string> = {};

      if (options?.is_read !== undefined) {
        params.is_read = options.is_read ? 'true' : 'false';
      }

      if (buildingId) {
        params.building = buildingId.toString();
      }

      const response = await api.get<PaginatedResponse<TodoNotification> | TodoNotification[]>(
        '/todos/notifications/',
        params
      );

      return Array.isArray(response) ? response : response?.results || [];
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute for live updates
  });

  const notifications = notificationsData || [];

  // Get unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Fetch only unread notifications (for header badge)
  const { data: unreadNotifications = [] } = useQuery({
    queryKey: todoNotificationKeys.list({ is_read: false }),
    queryFn: async () => {
      const params: Record<string, string> = {
        is_read: 'false',
      };

      if (buildingId) {
        params.building = buildingId.toString();
      }

      const response = await api.get<PaginatedResponse<TodoNotification> | TodoNotification[]>(
        '/todos/notifications/',
        params
      );

      return Array.isArray(response) ? response : response?.results || [];
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return api.post<TodoNotification>(
        `/todos/notifications/${notificationId}/mark-read/`,
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoNotificationKeys.all });
    },
  });

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    await Promise.all(unreadIds.map((id) => markAsReadMutation.mutateAsync(id)));
  }, [notifications, markAsReadMutation]);

  // Group notifications by type
  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications.filter((n) => n.notification_type === type);
  }, [notifications]);

  // Get due soon reminders
  const dueSoonReminders = getNotificationsByType('due_soon');

  // Get overdue reminders
  const overdueReminders = getNotificationsByType('overdue');

  // Get urgent notifications (overdue + due soon, unread)
  const urgentNotifications = notifications.filter(
    (n) => !n.is_read && (n.notification_type === 'overdue' || n.notification_type === 'due_soon')
  );

  return {
    // Data
    notifications,
    unreadNotifications,
    unreadCount,
    dueSoonReminders,
    overdueReminders,
    urgentNotifications,

    // Loading states
    isLoading,
    isMarkingRead: markAsReadMutation.isPending,

    // Error
    error,

    // Actions
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead,
    refetch,

    // Helpers
    getNotificationsByType,
  };
}

/**
 * Hook specifically for header reminder badge
 */
export function useReminderBadge() {
  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reminderBadge', buildingId],
    queryFn: async () => {
      const params: Record<string, string> = {
        is_read: 'false',
      };

      if (buildingId) {
        params.building = buildingId.toString();
      }

      // Fetch unread notifications
      const notificationsResponse = await api.get<PaginatedResponse<TodoNotification> | TodoNotification[]>(
        '/todos/notifications/',
        params
      );

      const notifications = Array.isArray(notificationsResponse)
        ? notificationsResponse
        : notificationsResponse?.results || [];

      // Separate by type
      const overdue = notifications.filter((n) => n.notification_type === 'overdue');
      const dueSoon = notifications.filter((n) => n.notification_type === 'due_soon');
      const other = notifications.filter(
        (n) => n.notification_type !== 'overdue' && n.notification_type !== 'due_soon'
      );

      return {
        total: notifications.length,
        overdueCount: overdue.length,
        dueSoonCount: dueSoon.length,
        otherCount: other.length,
        notifications: notifications.slice(0, 10), // Latest 10 for dropdown
      };
    },
    staleTime: 30000,
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    total: data?.total || 0,
    overdueCount: data?.overdueCount || 0,
    dueSoonCount: data?.dueSoonCount || 0,
    otherCount: data?.otherCount || 0,
    notifications: data?.notifications || [],
    isLoading,
    refetch,
  };
}

export default useTodoNotifications;
