'use client';

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
  User,
  MoreVertical,
  Trash2,
  Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TodoItem as TodoItemType, TodoPriority, TodoStatus } from '@/hooks/useTodos';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TodoItemProps {
  todo: TodoItemType;
  onComplete?: (id: number) => void;
  onEdit?: (todo: TodoItemType) => void;
  onDelete?: (id: number) => void;
  onStatusChange?: (id: number, status: TodoStatus) => void;
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

const priorityConfig: Record<TodoPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Χαμηλή', color: 'text-green-700', bgColor: 'bg-green-100' },
  medium: { label: 'Μεσαία', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  high: { label: 'Υψηλή', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  urgent: { label: 'Επείγον', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const statusConfig: Record<TodoStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Εκκρεμεί', icon: Circle, color: 'text-slate-500' },
  in_progress: { label: 'Σε Εξέλιξη', icon: PlayCircle, color: 'text-blue-500' },
  completed: { label: 'Ολοκληρώθηκε', icon: CheckCircle2, color: 'text-green-500' },
  cancelled: { label: 'Ακυρώθηκε', icon: XCircle, color: 'text-slate-400' },
};

export function TodoItem({
  todo,
  onComplete,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
  showActions = true,
  className,
}: TodoItemProps) {
  const priority = priorityConfig[todo.priority];
  const status = statusConfig[todo.status];
  const StatusIcon = status.icon;

  const isOverdue = todo.is_overdue;
  const isDueSoon = todo.is_due_soon;

  const handleStatusClick = () => {
    if (todo.status === 'pending') {
      onStatusChange?.(todo.id, 'in_progress');
    } else if (todo.status === 'in_progress') {
      onComplete?.(todo.id);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors',
          isOverdue && 'bg-red-50 hover:bg-red-100',
          isDueSoon && !isOverdue && 'bg-amber-50 hover:bg-amber-100',
          className
        )}
      >
        <button
          onClick={handleStatusClick}
          className={cn('flex-shrink-0', status.color)}
          title={status.label}
        >
          <StatusIcon className="w-5 h-5" />
        </button>
        
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            todo.status === 'completed' && 'line-through text-muted-foreground'
          )}>
            {todo.title}
          </p>
          {todo.due_date && (
            <p className={cn(
              'text-xs',
              isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-muted-foreground'
            )}>
              {format(new Date(todo.due_date), 'd MMM', { locale: el })}
            </p>
          )}
        </div>

        <span className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded', priority.bgColor, priority.color)}>
          {priority.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all',
        isOverdue && 'border-red-200 bg-red-50/50',
        isDueSoon && !isOverdue && 'border-amber-200 bg-amber-50/50',
        todo.status === 'completed' && 'opacity-75',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status checkbox */}
        <button
          onClick={handleStatusClick}
          className={cn(
            'flex-shrink-0 mt-0.5 transition-transform hover:scale-110',
            status.color
          )}
          title={status.label}
        >
          <StatusIcon className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                'font-semibold text-foreground',
                todo.status === 'completed' && 'line-through text-muted-foreground'
              )}>
                {todo.title}
              </h4>
              
              {todo.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {todo.description}
                </p>
              )}
            </div>

            {/* Priority badge */}
            <span className={cn(
              'flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full',
              priority.bgColor,
              priority.color
            )}>
              {priority.label}
            </span>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
            {todo.due_date && (
              <span className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-red-600 font-medium',
                isDueSoon && !isOverdue && 'text-amber-600 font-medium'
              )}>
                {isOverdue ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <Calendar className="w-3.5 h-3.5" />
                )}
                {format(new Date(todo.due_date), 'd MMM yyyy', { locale: el })}
                {isOverdue && ' (Έληξε)'}
                {isDueSoon && !isOverdue && ' (Σύντομα)'}
              </span>
            )}

            {todo.estimated_hours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {todo.estimated_hours}ω
              </span>
            )}

            {todo.assigned_to && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Ανατεθειμένο
              </span>
            )}

            {todo.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {todo.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 bg-muted rounded text-[10px]"
                  >
                    {tag}
                  </span>
                ))}
                {todo.tags.length > 2 && (
                  <span className="text-[10px]">+{todo.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions menu */}
        {showActions && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1">
              <button
                onClick={() => onEdit?.(todo)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors"
              >
                <Edit className="w-4 h-4" />
                Επεξεργασία
              </button>
              {todo.status !== 'completed' && (
                <button
                  onClick={() => onComplete?.(todo.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors text-green-600"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Ολοκλήρωση
                </button>
              )}
              <button
                onClick={() => onDelete?.(todo.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Διαγραφή
              </button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

export default TodoItem;

