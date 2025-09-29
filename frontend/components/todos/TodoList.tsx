'use client';

import React from 'react';
import TodoItem from './TodoItem';
import type { TodoItem as Todo } from '@/lib/todos';

type Props = {
  todos: Todo[];
  isLoading?: boolean;
};

export default function TodoList({ todos, isLoading = false }: Props) {
  if (isLoading) {
    return <div className="text-xs text-gray-500 dark:text-gray-400 p-2">Φόρτωση εκκρεμοτήτων...</div>;
  }

  if (!todos || todos.length === 0) {
    return <div className="text-xs text-gray-500 dark:text-gray-400 p-2">Δεν υπάρχουν εκκρεμότητες</div>;
  }

  return (
    <div className="space-y-2">
      {todos.map((t) => (
        <TodoItem key={t.id} todo={t} />
      ))}
    </div>
  );
}


