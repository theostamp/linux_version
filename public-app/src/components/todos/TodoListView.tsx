'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, SortAsc, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTodos, TodoItem as TodoItemType, TodoStatus, TodoPriority } from '@/hooks/useTodos';
import { TodoItem } from './TodoItem';
import { TodoQuickAdd } from './TodoQuickAdd';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface TodoListViewProps {
  buildingId: number;
  className?: string;
}

type SortOption = 'priority' | 'due_date' | 'created_at';

const statusTabs: { value: TodoStatus | 'all' | 'active'; label: string }[] = [
  { value: 'all', label: 'Όλα' },
  { value: 'active', label: 'Ενεργά' },
  { value: 'pending', label: 'Εκκρεμή' },
  { value: 'in_progress', label: 'Σε Εξέλιξη' },
  { value: 'completed', label: 'Ολοκληρωμένα' },
];

export function TodoListView({ buildingId, className }: TodoListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TodoStatus | 'all' | 'active'>('active');
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');

  const {
    todos,
    categories,
    isLoading,
    createTodo,
    completeTodo,
    updateTodo,
    deleteTodo,
    isCreating,
    getOverdueTodos,
    getDueSoonTodos,
  } = useTodos();

  // Filtered and sorted todos
  const filteredTodos = useMemo(() => {
    let result = [...todos];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (todo) =>
          todo.title.toLowerCase().includes(query) ||
          todo.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
    } else if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'priority') {
        return b.priority_score - a.priority_score;
      }
      if (sortBy === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      // created_at
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [todos, searchQuery, statusFilter, priorityFilter, sortBy]);

  const overdueTodos = getOverdueTodos();
  const dueSoonTodos = getDueSoonTodos();

  const handleEdit = (todo: TodoItemType) => {
    // TODO: Open edit modal
    console.log('Edit todo:', todo);
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Alerts */}
      {(overdueTodos.length > 0 || dueSoonTodos.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {overdueTodos.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">{overdueTodos.length} εκπρόθεσμα</span>
            </div>
          )}
          {dueSoonTodos.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{dueSoonTodos.length} λήγουν σύντομα</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Αναζήτηση εργασιών..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Priority filter */}
        <Select
          value={priorityFilter}
          onValueChange={(val) => setPriorityFilter(val as TodoPriority | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Προτεραιότητα" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες</SelectItem>
            <SelectItem value="urgent">Επείγον</SelectItem>
            <SelectItem value="high">Υψηλή</SelectItem>
            <SelectItem value="medium">Μεσαία</SelectItem>
            <SelectItem value="low">Χαμηλή</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sortBy}
          onValueChange={(val) => setSortBy(val as SortOption)}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SortAsc className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Ταξινόμηση" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Προτεραιότητα</SelectItem>
            <SelectItem value="due_date">Ημερομηνία</SelectItem>
            <SelectItem value="created_at">Πρόσφατα</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              statusFilter === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quick add */}
      <TodoQuickAdd
        buildingId={buildingId}
        categories={categories}
        onAdd={createTodo}
        isLoading={isCreating}
      />

      {/* Todo list */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">Δεν βρέθηκαν εργασίες</p>
            <p className="text-sm mt-1">
              {searchQuery || priorityFilter !== 'all'
                ? 'Δοκιμάστε διαφορετικά φίλτρα'
                : 'Δημιουργήστε μια νέα εργασία για να ξεκινήσετε'}
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onComplete={completeTodo}
              onEdit={handleEdit}
              onDelete={deleteTodo}
              onStatusChange={(id, status) => updateTodo(id, { status })}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default TodoListView;

