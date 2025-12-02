'use client';

import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { el } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTodos, TodoItem as TodoItemType } from '@/hooks/useTodos';
import { TodoItem } from './TodoItem';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface TodoCalendarViewProps {
  buildingId: number;
  className?: string;
}

const weekDays = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];

export function TodoCalendarView({ buildingId, className }: TodoCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const {
    todos,
    isLoading,
    completeTodo,
    updateTodo,
    deleteTodo,
  } = useTodos();

  // Get days of current month view
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    // Get all days of the month
    const days = eachDayOfInterval({ start, end });
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = start.getDay();
    // Adjust for Monday start (0 = Monday in our display)
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    return { days, paddingDays };
  }, [currentMonth]);

  // Group todos by date
  const todosByDate = useMemo(() => {
    const map = new Map<string, TodoItemType[]>();
    
    todos.forEach((todo) => {
      if (todo.due_date) {
        const dateKey = format(new Date(todo.due_date), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        existing.push(todo);
        map.set(dateKey, existing);
      }
    });
    
    return map;
  }, [todos]);

  // Get todos for selected date
  const selectedDateTodos = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return todosByDate.get(dateKey) || [];
  }, [selectedDate, todosByDate]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleEdit = (todo: TodoItemType) => {
    console.log('Edit todo:', todo);
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {format(currentMonth, 'LLLL yyyy', { locale: el })}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Σήμερα
          </Button>
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Calendar grid */}
        <div className="bg-card rounded-xl border overflow-hidden">
          {/* Week day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {weekDays.map((day) => (
              <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {/* Padding for first week */}
            {[...Array(calendarDays.paddingDays)].map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[100px] border-b border-r bg-muted/30" />
            ))}

            {/* Actual days */}
            {calendarDays.days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTodos = todosByDate.get(dateKey) || [];
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasOverdue = dayTodos.some((t) => t.is_overdue);
              const hasDueSoon = dayTodos.some((t) => t.is_due_soon && !t.is_overdue);
              const allCompleted = dayTodos.length > 0 && dayTodos.every((t) => t.status === 'completed');

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'min-h-[100px] border-b border-r p-2 text-left transition-colors hover:bg-muted/50',
                    isSelected && 'bg-primary/10 ring-2 ring-primary ring-inset',
                    !isSameMonth(day, currentMonth) && 'opacity-50 bg-muted/30'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium',
                        isToday(day) && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Status indicators */}
                    <div className="flex items-center gap-1">
                      {hasOverdue && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      {hasDueSoon && (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                      {allCompleted && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>

                  {/* Todo previews */}
                  {dayTodos.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {dayTodos.slice(0, 3).map((todo) => (
                        <div
                          key={todo.id}
                          className={cn(
                            'px-1.5 py-0.5 text-[10px] rounded truncate',
                            todo.status === 'completed'
                              ? 'bg-green-100 text-green-700 line-through'
                              : todo.is_overdue
                              ? 'bg-red-100 text-red-700'
                              : todo.is_due_soon
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {todo.title}
                        </div>
                      ))}
                      {dayTodos.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1.5">
                          +{dayTodos.length - 3} ακόμα
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date details */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold mb-4">
            {selectedDate
              ? format(selectedDate, 'EEEE, d MMMM', { locale: el })
              : 'Επιλέξτε ημερομηνία'}
          </h3>

          {selectedDate && (
            <div className="space-y-3">
              {selectedDateTodos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Δεν υπάρχουν εργασίες για αυτή την ημέρα
                </p>
              ) : (
                selectedDateTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    compact
                    onComplete={completeTodo}
                    onEdit={handleEdit}
                    onDelete={deleteTodo}
                    onStatusChange={(id, status) => updateTodo(id, { status })}
                    showActions={false}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TodoCalendarView;

