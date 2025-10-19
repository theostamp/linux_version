import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTodos,
  fetchPendingTodosCount,
  FetchTodosParams,
  TodoItem,
  fetchTodoCategories,
  TodoCategory,
  createTodoCategory,
  updateTodoCategory,
  deleteTodoCategory,
  TodoCategoryPayload,
  fetchTodoNotifications,
  markNotificationAsRead,
  TodoNotification,
  triggerTodoReminders,
  triggerTemplateAutoCreate,
  triggerSyncFinancialOverdues,
  triggerSyncMaintenanceSchedule,
} from '@/lib/todos';

export function useTodos(params: FetchTodosParams = {}) {
  return useQuery<TodoItem[]>({
    queryKey: ['todos', params],
    queryFn: () => fetchTodos(params),
    staleTime: 30_000,
  });
}

export function useTodoPendingCount(buildingId?: number | null) {
  return useQuery<number>({
    queryKey: ['todos', 'pending-count', buildingId],
    queryFn: () => fetchPendingTodosCount(buildingId),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: (failureCount, error: any) => {
      // Don't retry on 403 errors (permission denied)
      if (error?.response?.status === 403) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Add timeout to prevent hanging
    networkMode: 'online' as const,
    onError: (error) => {
      console.error('[useTodoPendingCount] Query error:', error);
    },
  });
}

export function useTodoCategories(buildingId?: number | null) {
  return useQuery<TodoCategory[]>({
    queryKey: ['todos', 'categories', buildingId],
    queryFn: () => fetchTodoCategories(buildingId),
    staleTime: 5 * 60_000,
  });
}

export function useTodoNotifications(buildingId?: number | null, isRead?: boolean) {
  return useQuery<TodoNotification[]>({
    queryKey: ['todos', 'notifications', { buildingId, isRead }],
    queryFn: () => fetchTodoNotifications({ buildingId, is_read: isRead }),
    staleTime: 30_000,
  });
}

export function useMarkNotificationAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => markNotificationAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['todos', 'pending-count'] });
    },
  });
}

export function useTriggerTodoReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ buildingId }: { buildingId?: number | null }) => triggerTodoReminders(buildingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['todos', 'pending-count'] });
    },
  });
}

export function useTriggerTemplateAutoCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ buildingId }: { buildingId?: number | null }) => triggerTemplateAutoCreate(buildingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}

export function useTriggerSyncFinancialOverdues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ buildingId }: { buildingId?: number | null }) => triggerSyncFinancialOverdues(buildingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos'] });
      qc.invalidateQueries({ queryKey: ['todos', 'pending-count'] });
      qc.invalidateQueries({ queryKey: ['todos', 'notifications'] });
    },
  });
}

export function useTriggerSyncMaintenanceSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ buildingId }: { buildingId?: number | null }) => triggerSyncMaintenanceSchedule(buildingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos'] });
      qc.invalidateQueries({ queryKey: ['todos', 'pending-count'] });
    },
  });
}

export function useCreateTodoCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TodoCategoryPayload) => createTodoCategory(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['todos', 'categories', variables.building] });
      qc.invalidateQueries({ queryKey: ['todos', 'categories'] });
    },
  });
}

export function useUpdateTodoCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<TodoCategoryPayload>) =>
      updateTodoCategory(id, payload),
    onSuccess: (_data, variables) => {
      const building = (variables as any).building;
      if (building !== undefined) {
        qc.invalidateQueries({ queryKey: ['todos', 'categories', building] });
      }
      qc.invalidateQueries({ queryKey: ['todos', 'categories'] });
    },
  });
}

export function useDeleteTodoCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => deleteTodoCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'categories'] });
    },
  });
}


