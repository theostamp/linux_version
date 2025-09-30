/**
 * React Query hooks for notification templates
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationTemplatesApi } from '@/lib/api/notifications';
import type {
  NotificationTemplate,
  TemplatePreviewRequest,
} from '@/types/notifications';
import { toast } from 'sonner';

/**
 * Query keys
 */
export const templateKeys = {
  all: ['notification-templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...templateKeys.lists(), filters] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: number) => [...templateKeys.details(), id] as const,
};

/**
 * Get all notification templates
 */
export function useNotificationTemplates(params?: {
  category?: string;
  is_active?: boolean;
  building?: number;
}) {
  return useQuery({
    queryKey: templateKeys.list(params || {}),
    queryFn: () => notificationTemplatesApi.list(params),
  });
}

/**
 * Get template by ID
 */
export function useNotificationTemplate(id: number) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => notificationTemplatesApi.get(id),
    enabled: !!id,
  });
}

/**
 * Create notification template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<NotificationTemplate>) =>
      notificationTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template δημιουργήθηκε επιτυχώς');
    },
    onError: (error: any) => {
      toast.error('Αποτυχία δημιουργίας template', {
        description: error.response?.data?.detail || error.message,
      });
    },
  });
}

/**
 * Update notification template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<NotificationTemplate>;
    }) => notificationTemplatesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template ενημερώθηκε επιτυχώς');
    },
    onError: (error: any) => {
      toast.error('Αποτυχία ενημέρωσης template', {
        description: error.response?.data?.detail || error.message,
      });
    },
  });
}

/**
 * Delete notification template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template διαγράφηκε επιτυχώς');
    },
    onError: (error: any) => {
      toast.error('Αποτυχία διαγραφής template', {
        description: error.response?.data?.detail || error.message,
      });
    },
  });
}

/**
 * Preview rendered template
 */
export function usePreviewTemplate() {
  return useMutation({
    mutationFn: (data: TemplatePreviewRequest) =>
      notificationTemplatesApi.preview(data),
    onError: (error: any) => {
      toast.error('Αποτυχία προεπισκόπησης template', {
        description: error.response?.data?.detail || error.message,
      });
    },
  });
}