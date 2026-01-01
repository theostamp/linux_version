'use client';

import React, { useState } from 'react';
import { Plus, Calendar, Flag, X } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TodoPriority, CreateTodoPayload, TodoCategory } from '@/hooks/useTodos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TodoQuickAddProps {
  buildingId: number;
  categories: TodoCategory[];
  onAdd: (payload: CreateTodoPayload) => Promise<void>;
  isLoading?: boolean;
  defaultCategoryId?: number;
  className?: string;
}

const priorityOptions: { value: TodoPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Χαμηλή', color: 'text-green-600' },
  { value: 'medium', label: 'Μεσαία', color: 'text-blue-600' },
  { value: 'high', label: 'Υψηλή', color: 'text-orange-600' },
  { value: 'urgent', label: 'Επείγον', color: 'text-red-600' },
];

export function TodoQuickAdd({
  buildingId,
  categories,
  onAdd,
  isLoading = false,
  defaultCategoryId,
  className,
}: TodoQuickAddProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(defaultCategoryId);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Need a category - use first available if none selected
    const finalCategoryId = categoryId || categories[0]?.id;
    if (!finalCategoryId) {
      return;
    }

    await onAdd({
      title: title.trim(),
      building: buildingId,
      category: finalCategoryId,
      priority,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
    });

    // Reset form
    setTitle('');
    setPriority('medium');
    setDueDate(undefined);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setTitle('');
    setPriority('medium');
    setDueDate(undefined);
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'flex items-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-muted-foreground/25',
          'text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/50',
          'transition-all duration-200',
          className
        )}
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-medium">Νέα εργασία...</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'p-4 rounded-xl border bg-card shadow-sm',
        className
      )}
    >
      <div className="space-y-3">
        {/* Title input */}
        <Input
          autoFocus
          placeholder="Τι πρέπει να γίνει;"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-0 bg-transparent text-base font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 px-0"
        />

        {/* Options row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category selector */}
          {categories.length > 0 && (
            <Select
              value={categoryId?.toString()}
              onValueChange={(val) => setCategoryId(parseInt(val))}
            >
              <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
                <SelectValue placeholder="Κατηγορία" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Priority selector */}
          <Select
            value={priority}
            onValueChange={(val) => setPriority(val as TodoPriority)}
          >
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
              <Flag className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className={opt.color}>{opt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Due date picker */}
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={dueDate ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 text-xs gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                {dueDate
                  ? format(dueDate, 'd MMM', { locale: el })
                  : 'Ημερομηνία'}
                {dueDate && (
                  <X
                    className="w-3 h-3 ml-1 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDueDate(undefined);
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={dueDate}
                onSelect={(date) => {
                  setDueDate(date);
                  setIsDatePickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Ακύρωση
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!title.trim() || isLoading || (!categoryId && categories.length > 0)}
          >
            {isLoading ? 'Αποθήκευση...' : 'Προσθήκη'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default TodoQuickAdd;
