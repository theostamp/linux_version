'use client';

import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';

type TodoSidebarContextValue = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  pendingCount: number;
  setPendingCount: (count: number) => void;
};

const TodoSidebarContext = createContext<TodoSidebarContextValue | undefined>(undefined);

export function useTodoSidebar(): TodoSidebarContextValue {
  const ctx = useContext(TodoSidebarContext);
  if (!ctx) {
    throw new Error('useTodoSidebar must be used within TodoSidebarProvider');
  }
  return ctx;
}

export function TodoSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const value = useMemo<TodoSidebarContextValue>(() => ({
    isOpen,
    toggle: () => setIsOpen((v) => !v),
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    pendingCount,
    setPendingCount,
  }), [isOpen, pendingCount]);

  return (
    <TodoSidebarContext.Provider value={value}>{children}</TodoSidebarContext.Provider>
  );
}


