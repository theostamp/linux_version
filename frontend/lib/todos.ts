import { api } from '@/lib/api';

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TodoItem {
  id: number;
  title: string;
  description: string;
  category: number;
  building: number;
  apartment: number | null;
  priority: TodoPriority;
  status: TodoStatus;
  due_date: string | null;
  completed_at: string | null;
  created_by: number;
  assigned_to: number | null;
  estimated_hours: string | null;
  actual_hours: string | null;
  tags: string[];
  attachments: unknown[];
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
  is_due_soon: boolean;
  priority_score: number;
}

export interface FetchTodosParams {
  buildingId?: number | null;
  status?: TodoStatus;
  category?: number;
  priority?: TodoPriority;
  assigned_to?: number;
  overdue?: boolean;
  due_soon?: boolean;
  tag?: string;
  search?: string;
  ordering?: string;
}

export async function fetchTodos(params: FetchTodosParams = {}): Promise<TodoItem[]> {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set('status', params.status);
  if (params.category) searchParams.set('category', String(params.category));
  if (params.priority) searchParams.set('priority', params.priority);
  if (params.assigned_to) searchParams.set('assigned_to', String(params.assigned_to));
  if (params.overdue) searchParams.set('overdue', '1');
  if (params.due_soon) searchParams.set('due_soon', '1');
  if (params.tag) searchParams.set('tag', params.tag);
  if (params.search) searchParams.set('search', params.search);
  if (params.ordering) searchParams.set('ordering', params.ordering);

  // Building filter: undefined -> omit, null -> 'null', number -> as is
  if (params.buildingId !== undefined) {
    if (params.buildingId === null) {
      searchParams.set('building', 'null');
    } else {
      searchParams.set('building', String(params.buildingId));
    }
  }

  const query = searchParams.toString();
  const { data } = await api.get(`/api/todos/items/${query ? `?${query}` : ''}`);
  // Normalize paginated/non-paginated responses to array
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export async function fetchPendingTodosCount(buildingId?: number | null): Promise<number> {
  const searchParams = new URLSearchParams();
  if (buildingId !== undefined) {
    if (buildingId === null) {
      searchParams.set('building', 'null');
    } else {
      searchParams.set('building', String(buildingId));
    }
  }
  const query = searchParams.toString();
  const { data } = await api.get(`/api/todos/items/pending-count/${query ? `?${query}` : ''}`);
  return data.count ?? 0;
}

export interface TodoCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
  building: number;
  description: string;
  is_active: boolean;
}

export async function fetchTodoCategories(buildingId?: number | null): Promise<TodoCategory[]> {
  const searchParams = new URLSearchParams();
  if (buildingId !== undefined) {
    if (buildingId === null) searchParams.set('building', 'null');
    else searchParams.set('building', String(buildingId));
  }
  const query = searchParams.toString();
  const { data } = await api.get(`/api/todos/categories/${query ? `?${query}` : ''}`);
  return data;
}

export type TodoCategoryColor = 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray';

export interface TodoCategoryPayload {
  name: string;
  icon?: string;
  color?: TodoCategoryColor;
  building: number;
  description?: string;
  is_active?: boolean;
}

export async function createTodoCategory(payload: TodoCategoryPayload): Promise<TodoCategory> {
  const { data } = await api.post('/api/todos/categories/', payload);
  return data;
}

export async function updateTodoCategory(id: number, payload: Partial<TodoCategoryPayload>): Promise<TodoCategory> {
  const { data } = await api.patch(`/api/todos/categories/${id}/`, payload);
  return data;
}

export async function deleteTodoCategory(id: number): Promise<void> {
  await api.delete(`/api/todos/categories/${id}/`);
}

export interface TodoNotification {
  id: number;
  todo: number;
  user: number;
  notification_type: 'due_soon' | 'overdue' | 'completed' | 'assigned' | 'reminder';
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export async function fetchTodoNotifications(params: { buildingId?: number | null; is_read?: boolean } = {}): Promise<TodoNotification[]> {
  const searchParams = new URLSearchParams();
  if (params.buildingId !== undefined) {
    if (params.buildingId === null) searchParams.set('building', 'null');
    else searchParams.set('building', String(params.buildingId));
  }
  if (typeof params.is_read === 'boolean') {
    searchParams.set('is_read', params.is_read ? '1' : '0');
  }
  const query = searchParams.toString();
  const { data } = await api.get(`/api/todos/notifications/${query ? `?${query}` : ''}`);
  return data;
}

export async function markNotificationAsRead(id: number): Promise<TodoNotification> {
  const { data } = await api.post(`/api/todos/notifications/${id}/mark-read/`);
  return data;
}

export async function triggerTodoReminders(buildingId?: number | null): Promise<{ created: number; skipped: number; due_soon: number; overdue: number; }> {
  const searchParams = new URLSearchParams();
  if (buildingId !== undefined) {
    if (buildingId === null) searchParams.set('building', 'null');
    else searchParams.set('building', String(buildingId));
  }
  const query = searchParams.toString();
  const { data } = await api.post(`/api/todos/items/generate-reminders/${query ? `?${query}` : ''}`);
  return data;
}

export async function triggerTemplateAutoCreate(buildingId?: number | null): Promise<{ created: number; checked: number; }> {
  const searchParams = new URLSearchParams();
  if (buildingId !== undefined) {
    if (buildingId === null) searchParams.set('building', 'null');
    else searchParams.set('building', String(buildingId));
  }
  const query = searchParams.toString();
  const { data } = await api.post(`/api/todos/templates/auto-create/${query ? `?${query}` : ''}`);
  return data;
}

export async function triggerSyncFinancialOverdues(buildingId?: number | null): Promise<{ created: number; skipped: number; total_apartments_with_debt: number; }> {
  const searchParams = new URLSearchParams();
  if (buildingId !== undefined) {
    if (buildingId === null) searchParams.set('building', 'null');
    else searchParams.set('building', String(buildingId));
  }
  const query = searchParams.toString();
  const { data } = await api.post(`/api/todos/items/sync-financial-overdues/${query ? `?${query}` : ''}`);
  return data;
}

export async function triggerSyncMaintenanceSchedule(buildingId?: number | null): Promise<{ created: number; skipped: number; total_scheduled: number; }> {
  const searchParams = new URLSearchParams();
  if (buildingId !== undefined) {
    if (buildingId === null) searchParams.set('building', 'null');
    else searchParams.set('building', String(buildingId));
  }
  const query = searchParams.toString();
  const { data } = await api.post(`/api/todos/items/sync-maintenance-schedule/${query ? `?${query}` : ''}`);
  return data;
}


