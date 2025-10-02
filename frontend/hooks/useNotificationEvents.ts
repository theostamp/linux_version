/**
 * React Query hooks for notification events
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationEventsApi } from '@/lib/api/notifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useToast } from '@/hooks/use-toast';
import type {
  NotificationEvent,
  PendingEventsResponse,
  DigestPreview,
  DigestPreviewRequest,
  SendDigestRequest,
  SendDigestResponse,
} from '@/types/notifications';

/**
 * Query keys for notification events
 */
export const notificationEventKeys = {
  all: ['notification-events'] as const,
  lists: () => [...notificationEventKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...notificationEventKeys.lists(), filters] as const,
  details: () => [...notificationEventKeys.all, 'detail'] as const,
  detail: (id: number) => [...notificationEventKeys.details(), id] as const,
  pending: (buildingId: number, sinceDate?: string) =>
    [...notificationEventKeys.all, 'pending', buildingId, sinceDate] as const,
};

/**
 * Hook to get all notification events
 */
export function useNotificationEvents(filters?: {
  event_type?: string;
  building?: number;
  is_urgent?: boolean;
  included_in_digest?: boolean;
  sent_immediately?: boolean;
}) {
  return useQuery({
    queryKey: notificationEventKeys.list(filters || {}),
    queryFn: () => notificationEventsApi.list(filters),
  });
}

/**
 * Hook to get a single notification event
 */
export function useNotificationEvent(id: number) {
  return useQuery({
    queryKey: notificationEventKeys.detail(id),
    queryFn: () => notificationEventsApi.get(id),
    enabled: !!id,
  });
}

/**
 * Hook to get pending events
 */
export function usePendingEvents(buildingId?: number, sinceDate?: string) {
  const { currentBuilding } = useBuilding();
  const effectiveBuildingId = buildingId || currentBuilding?.id;

  return useQuery<PendingEventsResponse>({
    queryKey: notificationEventKeys.pending(effectiveBuildingId!, sinceDate),
    queryFn: () => notificationEventsApi.pending(effectiveBuildingId!, sinceDate),
    enabled: !!effectiveBuildingId,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to preview digest email
 */
export function useDigestPreview() {
  const { currentBuilding } = useBuilding();

  return useMutation<DigestPreview, Error, Partial<DigestPreviewRequest>>({
    mutationFn: (request) =>
      notificationEventsApi.previewDigest({
        building_id: request.building_id || currentBuilding?.id!,
        since_date: request.since_date,
      }),
  });
}

/**
 * Hook to send digest email
 */
export function useSendDigest() {
  const queryClient = useQueryClient();
  const { currentBuilding } = useBuilding();
  const { toast } = useToast();

  return useMutation<SendDigestResponse, Error, Partial<SendDigestRequest>>({
    mutationFn: (request) =>
      notificationEventsApi.sendDigest({
        building_id: request.building_id || currentBuilding?.id!,
        since_date: request.since_date,
      }),
    onSuccess: (data) => {
      // Invalidate pending events query
      queryClient.invalidateQueries({
        queryKey: notificationEventKeys.pending(currentBuilding?.id!, undefined),
      });

      // Invalidate events list
      queryClient.invalidateQueries({
        queryKey: notificationEventKeys.lists(),
      });

      // Show success toast
      if (data.notification_id) {
        toast({
          title: 'Digest Στάλθηκε',
          description: `Η ενημέρωση στάλθηκε σε ${data.recipients} διαμερίσματα`,
        });
      } else {
        toast({
          title: 'Δεν Υπάρχουν Ειδοποιήσεις',
          description: 'Δεν βρέθηκαν νέα γεγονότα για αποστολή',
          variant: 'default',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Σφάλμα Αποστολής',
        description: error.message || 'Η αποστολή απέτυχε',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to check if there are pending events
 */
export function useHasPendingEvents(buildingId?: number) {
  const { data: pending } = usePendingEvents(buildingId);
  return {
    hasPending: (pending?.count || 0) > 0,
    count: pending?.count || 0,
    eventsByType: pending?.events_by_type || {},
  };
}
