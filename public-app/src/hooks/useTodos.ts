'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { toast } from 'sonner';

// Types
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TodoCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
  building: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodoItem {
  id: number;
  title: string;
  description: string;
  category: number;
  building: number;
  apartment?: number | null;
  priority: TodoPriority;
  status: TodoStatus;
  due_date?: string | null;
  completed_at?: string | null;
  created_by: number;
  assigned_to?: number | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  tags: string[];
  attachments: string[];
  created_at: string;
  updated_at: string;
  // Computed fields from backend
  is_overdue: boolean;
  is_due_soon: boolean;
  priority_score: number;
}

export interface CreateTodoPayload {
  title: string;
  description?: string;
  category: number;
  building: number;
  apartment?: number | null;
  priority?: TodoPriority;
  due_date?: string | null;
  assigned_to?: number | null;
  estimated_hours?: number | null;
  tags?: string[];
}

export interface UpdateTodoPayload {
  title?: string;
  description?: string;
  category?: number;
  priority?: TodoPriority;
  status?: TodoStatus;
  due_date?: string | null;
  assigned_to?: number | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  tags?: string[];
}

export interface TodoFilters {
  status?: TodoStatus;
  priority?: TodoPriority;
  category?: number;
  assigned_to?: number;
  overdue?: boolean;
  due_soon?: boolean;
  tag?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Query keys
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (buildingId: number, filters?: TodoFilters) => 
    [...todoKeys.lists(), buildingId, filters] as const,
  detail: (id: number) => [...todoKeys.all, 'detail', id] as const,
  pendingCount: (buildingId: number) => [...todoKeys.all, 'pendingCount', buildingId] as const,
  categories: (buildingId: number) => [...todoKeys.all, 'categories', buildingId] as const,
};

/**
 * Hook for managing todos
 */
export function useTodos(filters?: TodoFilters) {
  const { selectedBuilding } = useBuilding();
  const queryClient = useQueryClient();
  const buildingId = selectedBuilding?.id;

  // Fetch todos
  const {
    data: todosData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: todoKeys.list(buildingId || 0, filters),
    queryFn: async () => {
      if (!buildingId) return [];
      
      const params: Record<string, string> = {
        building: buildingId.toString(),
      };
      
      if (filters?.status) params.status = filters.status;
      if (filters?.priority) params.priority = filters.priority;
      if (filters?.category) params.category = filters.category.toString();
      if (filters?.assigned_to) params.assigned_to = filters.assigned_to.toString();
      if (filters?.overdue) params.overdue = 'true';
      if (filters?.due_soon) params.due_soon = 'true';
      if (filters?.tag) params.tag = filters.tag;

      const response = await api.get<PaginatedResponse<TodoItem> | TodoItem[]>(
        '/todos/items/',
        params
      );
      
      return Array.isArray(response) ? response : response?.results || [];
    },
    enabled: !!buildingId,
    staleTime: 30000, // 30 seconds
  });

  const todos = todosData || [];

  // Fetch pending count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: todoKeys.pendingCount(buildingId || 0),
    queryFn: async () => {
      if (!buildingId) return 0;
      const response = await api.get<{ count: number }>(
        '/todos/items/pending-count/',
        { building: buildingId.toString() }
      );
      return response.count;
    },
    enabled: !!buildingId,
    staleTime: 30000,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: todoKeys.categories(buildingId || 0),
    queryFn: async () => {
      if (!buildingId) return [];
      const response = await api.get<PaginatedResponse<TodoCategory> | TodoCategory[]>(
        '/todos/categories/',
        { building: buildingId.toString() }
      );
      return Array.isArray(response) ? response : response?.results || [];
    },
    enabled: !!buildingId,
    staleTime: 60000, // 1 minute
  });

  const categories = categoriesData || [];

  // Create todo mutation
  const createMutation = useMutation({
    mutationFn: async (payload: CreateTodoPayload) => {
      return api.post<TodoItem>('/todos/items/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all });
      toast.success('Η εργασία δημιουργήθηκε επιτυχώς');
    },
    onError: (error: Error) => {
      toast.error(`Σφάλμα: ${error.message}`);
    },
  });

  // Update todo mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateTodoPayload }) => {
      return api.patch<TodoItem>(`/todos/items/${id}/`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all });
      toast.success('Η εργασία ενημερώθηκε επιτυχώς');
    },
    onError: (error: Error) => {
      toast.error(`Σφάλμα: ${error.message}`);
    },
  });

  // Delete todo mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/todos/items/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all });
      toast.success('Η εργασία διαγράφηκε επιτυχώς');
    },
    onError: (error: Error) => {
      toast.error(`Σφάλμα: ${error.message}`);
    },
  });

  // Complete todo (shortcut)
  const completeTodo = useCallback(async (id: number) => {
    await updateMutation.mutateAsync({
      id,
      payload: { status: 'completed' },
    });
  }, [updateMutation]);

  // Helper functions
  const getOverdueTodos = useCallback(() => {
    return todos.filter((todo) => todo.is_overdue);
  }, [todos]);

  const getDueSoonTodos = useCallback(() => {
    return todos.filter((todo) => todo.is_due_soon);
  }, [todos]);

  const getTodosByStatus = useCallback((status: TodoStatus) => {
    return todos.filter((todo) => todo.status === status);
  }, [todos]);

  const getTodosByPriority = useCallback((priority: TodoPriority) => {
    return todos.filter((todo) => todo.priority === priority);
  }, [todos]);

  return {
    // Data
    todos,
    categories,
    pendingCount,
    
    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Error
    error,
    
    // Actions
    createTodo: createMutation.mutateAsync,
    updateTodo: (id: number, payload: UpdateTodoPayload) => 
      updateMutation.mutateAsync({ id, payload }),
    deleteTodo: deleteMutation.mutateAsync,
    completeTodo,
    refetch,
    
    // Helpers
    getOverdueTodos,
    getDueSoonTodos,
    getTodosByStatus,
    getTodosByPriority,
  };
}

/**
 * Hook for fetching a single todo
 */
export function useTodoDetail(todoId: number | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: todoKeys.detail(todoId || 0),
    queryFn: async () => {
      if (!todoId) return null;
      return api.get<TodoItem>(`/todos/items/${todoId}/`);
    },
    enabled: !!todoId,
  });

  return {
    todo: data,
    isLoading,
    error,
    refetch,
  };
}

export default useTodos;

