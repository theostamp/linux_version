'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateTodo, useUpdateTodo } from '@/hooks/useTodoMutations';
import { useTodoCategories } from '@/hooks/useTodos';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TodoItem as Todo } from '@/lib/todos';

type FormValues = {
  title: string;
  description?: string;
  category: string; // id as string
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string; // ISO string
};

type Props = {
  onSubmitted?: () => void;
  todo?: Todo;
};

export default function TodoForm({ onSubmitted, todo }: Props) {
  const { selectedBuilding } = useBuilding();
  const { data: categories = [] } = useTodoCategories(selectedBuilding?.id);
  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      priority: 'medium',
    },
  });

  useEffect(() => {
    if (todo) {
      setValue('title', todo.title);
      setValue('description', todo.description || '');
      setValue('category', String(todo.category));
      setValue('priority', todo.priority);
      if (todo.due_date) {
        const dt = new Date(todo.due_date);
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setValue('due_date', local);
      }
    }
  }, [todo, setValue]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      description: values.description ?? '',
      category: Number(values.category),
      building: selectedBuilding?.id,
      priority: values.priority,
      due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
    } as any;
    if (todo?.id) {
      await updateMutation.mutateAsync({ id: todo.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onSubmitted?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Τίτλος</label>
        <Input placeholder="Π.χ. Συντήρηση καυστήρα" {...register('title', { required: true })} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Περιγραφή</label>
        <Textarea rows={3} placeholder="Λεπτομέρειες..." {...register('description')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Κατηγορία</label>
          <Select onValueChange={(v) => setValue('category', v)} defaultValue={todo ? String(todo.category) : undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Προτεραιότητα</label>
          <Select onValueChange={(v) => setValue('priority', v as any)} defaultValue={todo?.priority || 'medium'}>
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Χαμηλή</SelectItem>
              <SelectItem value="medium">Μεσαία</SelectItem>
              <SelectItem value="high">Υψηλή</SelectItem>
              <SelectItem value="urgent">Επείγουσα</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Λήξη</label>
        <Input type="datetime-local" {...register('due_date')} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
          {todo ? 'Αποθήκευση' : 'Προσθήκη'}
        </Button>
      </div>
    </form>
  );
}


