'use client';

import React, { useMemo } from 'react';
import { Circle, PlayCircle, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTodos, TodoItem as TodoItemType, TodoStatus } from '@/hooks/useTodos';
import { TodoItem } from './TodoItem';
import { TodoQuickAdd } from './TodoQuickAdd';
import { Skeleton } from '@/components/ui/skeleton';

interface TodoKanbanViewProps {
  buildingId: number;
  className?: string;
}

type KanbanColumn = {
  id: TodoStatus;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

const columns: KanbanColumn[] = [
  {
    id: 'pending',
    title: 'Εκκρεμή',
    icon: Circle,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
  {
    id: 'in_progress',
    title: 'Σε Εξέλιξη',
    icon: PlayCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'completed',
    title: 'Ολοκληρωμένα',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
];

export function TodoKanbanView({ buildingId, className }: TodoKanbanViewProps) {
  const {
    todos,
    categories,
    isLoading,
    createTodo,
    completeTodo,
    updateTodo,
    deleteTodo,
    isCreating,
  } = useTodos();

  // Group todos by status
  const todosByStatus = useMemo(() => {
    const groups: Record<TodoStatus, TodoItemType[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    todos.forEach((todo) => {
      if (groups[todo.status]) {
        groups[todo.status].push(todo);
      }
    });

    // Sort each group by priority
    Object.keys(groups).forEach((status) => {
      groups[status as TodoStatus].sort((a, b) => b.priority_score - a.priority_score);
    });

    return groups;
  }, [todos]);

  const handleDragStart = (e: React.DragEvent, todoId: number) => {
    e.dataTransfer.setData('todoId', todoId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: TodoStatus) => {
    e.preventDefault();
    const todoId = parseInt(e.dataTransfer.getData('todoId'));
    
    if (todoId) {
      await updateTodo(todoId, { status });
    }
  };

  const handleEdit = (todo: TodoItemType) => {
    console.log('Edit todo:', todo);
  };

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
        {columns.map((col) => (
          <div key={col.id} className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      {columns.map((column) => {
        const columnTodos = todosByStatus[column.id];
        const Icon = column.icon;

        return (
          <div
            key={column.id}
            className="flex flex-col bg-muted/30 rounded-xl p-3"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column header */}
            <div className={cn('flex items-center gap-2 mb-3 p-2 rounded-lg', column.bgColor)}>
              <Icon className={cn('w-5 h-5', column.color)} />
              <h3 className={cn('font-semibold', column.color)}>{column.title}</h3>
              <span className={cn('ml-auto text-sm font-medium px-2 py-0.5 rounded-full bg-background', column.color)}>
                {columnTodos.length}
              </span>
            </div>

            {/* Quick add for pending column */}
            {column.id === 'pending' && (
              <div className="mb-3">
                <TodoQuickAdd
                  buildingId={buildingId}
                  categories={categories}
                  onAdd={createTodo}
                  isLoading={isCreating}
                />
              </div>
            )}

            {/* Column content */}
            <div className="flex-1 space-y-3 min-h-[200px]">
              {columnTodos.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Δεν υπάρχουν εργασίες
                </div>
              ) : (
                columnTodos.map((todo) => (
                  <div
                    key={todo.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, todo.id)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <TodoItem
                      todo={todo}
                      onComplete={completeTodo}
                      onEdit={handleEdit}
                      onDelete={deleteTodo}
                      onStatusChange={(id, status) => updateTodo(id, { status })}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TodoKanbanView;

