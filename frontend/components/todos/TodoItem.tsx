'use client';

import React, { useState } from 'react';
import { Check, ChevronRight, Pencil, Trash2, Wrench, BadgeAlert } from 'lucide-react';
import type { TodoItem as Todo } from '@/lib/todos';
import { useCompleteTodo, useDeleteTodo } from '@/hooks/useTodoMutations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TodoForm from './TodoForm';

type Props = {
  todo: Todo;
};

export default function TodoItem({ todo }: Props) {
  const completeMutation = useCompleteTodo();
  const deleteMutation = useDeleteTodo();
  const [open, setOpen] = useState(false);

  const dueText = todo.due_date ? new Date(todo.due_date).toLocaleDateString() : '—';
  const priorityColor =
    todo.priority === 'urgent' ? 'text-red-600' :
    todo.priority === 'high' ? 'text-orange-600' :
    todo.priority === 'medium' ? 'text-blue-600' : 'text-green-600';

  const isCompleted = todo.status === 'completed';
  const isMaintenance = (todo.tags || []).includes('maintenance');
  const isFinancial = (todo.tags || []).includes('financial_overdue');

  return (
    <div className="w-full text-left p-3 rounded border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
      <div className="flex items-center justify-between">
        <p className={[
          'text-sm font-medium',
          isCompleted ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100',
        ].join(' ')}>
          {todo.title}
          {(isMaintenance || isFinancial) && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {isMaintenance && (<><Wrench className="w-3 h-3 text-orange-600" /> Συντήρηση</>)}
              {isFinancial && !isMaintenance && (<><BadgeAlert className="w-3 h-3 text-fuchsia-700" /> Οφειλή</>)}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {todo.status !== 'completed' && (
            <button
              onClick={() => completeMutation.mutate({ id: todo.id })}
              className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
              title="Ολοκλήρωση"
            >
              <Check className="w-4 h-4 text-green-600" />
            </button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Επεξεργασία">
                <Pencil className="w-4 h-4 text-blue-600" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Επεξεργασία TODO</DialogTitle>
              </DialogHeader>
              <TodoForm todo={todo} onSubmitted={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
          <button
            onClick={() => {
              if (confirm('Διαγραφή αυτού του TODO;')) deleteMutation.mutate({ id: todo.id });
            }}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Διαγραφή"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span className={priorityColor}>Προτεραιότητα: {todo.priority}</span>
      </p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Λήξη: {dueText}</p>
    </div>
  );
}


