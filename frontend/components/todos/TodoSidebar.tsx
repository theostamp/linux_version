'use client';

import React, { useEffect, useState } from 'react';
import { X, Plus, Filter, ChevronRight, Clock, AlertTriangle, CheckCircle2, FolderCog, Bell, RefreshCw, Wrench, BadgeAlert } from 'lucide-react';
import { useTodoSidebar } from './TodoSidebarContext';
import { useTodos } from '@/hooks/useTodos';
import { useBuilding } from '@/components/contexts/BuildingContext';
import TodoList from './TodoList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TodoForm from './TodoForm';
import TodoCategories from './TodoCategories';
import TodoNotifications from './TodoNotifications';
import { useTriggerSyncFinancialOverdues, useTriggerSyncMaintenanceSchedule } from '@/hooks/useTodos';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/components/contexts/AuthContext';

export default function TodoSidebar() {
  const { isOpen, close } = useTodoSidebar();
  const { selectedBuilding } = useBuilding();
  const { user, isAuthReady } = useAuth();
  const syncOverdues = useTriggerSyncFinancialOverdues();
  const syncMaintenance = useTriggerSyncMaintenanceSchedule();
  const [filter, setFilter] = useState<'all'|'pending'|'due_soon'|'overdue'|'maintenance'|'financial'>('all');
  const { data: todos = [], isLoading, refetch } = useTodos({ 
    buildingId: selectedBuilding?.id,
    status: filter === 'pending' ? 'pending' : undefined,
    overdue: filter === 'overdue' ? true : undefined,
    // @ts-expect-error allow passing extra param
    due_soon: filter === 'due_soon' ? true : undefined,
    tag: filter === 'maintenance' ? 'maintenance' : filter === 'financial' ? 'financial_overdue' : undefined,
  } as any);

  // Prevent body scroll when open (overlay-like behavior on mobile)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <aside
      className={[
        'fixed top-0 right-0 h-full w-[360px] max-w-[85vw] z-50',
        'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        'flex flex-col',
      ].join(' ')}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <CheckCircle2 className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Εκκρεμότητες</h3>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Φίλτρα">
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          {user && (user.is_superuser || user.is_staff || user.role === 'manager') && (
          <button
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            title="Συγχρονισμός Προγραμματισμένων Συντηρήσεων"
            onClick={async () => {
              if (!selectedBuilding?.id) {
                toast.error('Επιλέξτε κτίριο για συγχρονισμό');
                return;
              }
              try {
                const p = syncMaintenance.mutateAsync({ buildingId: selectedBuilding.id });
                toast.promise(p, {
                  loading: 'Συγχρονισμός συντηρήσεων...',
                  success: () => 'Ο συγχρονισμός ολοκληρώθηκε',
                  error: 'Αποτυχία συγχρονισμού',
                });
                await p;
                refetch();
              } catch {}
            }}
            disabled={syncMaintenance.isPending}
          >
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          )}
          {user && (user.is_superuser || user.is_staff || user.role === 'manager') && (
          <button
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            title="Συγχρονισμός Ληγμένων Οφειλών"
            onClick={async () => {
              if (!selectedBuilding?.id) {
                toast.error('Επιλέξτε κτίριο για συγχρονισμό');
                return;
              }
              try {
                const p = syncOverdues.mutateAsync({ buildingId: selectedBuilding.id });
                toast.promise(p, {
                  loading: 'Συγχρονισμός οφειλών...',
                  success: () => 'Ο συγχρονισμός ολοκληρώθηκε',
                  error: 'Αποτυχία συγχρονισμού',
                });
                await p;
                refetch();
              } catch {}
            }}
            disabled={syncOverdues.isPending}
          >
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Διαχείριση Κατηγοριών">
                <FolderCog className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Κατηγορίες TODO</DialogTitle>
              </DialogHeader>
              <TodoCategories />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Νέο TODO">
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Νέο TODO</DialogTitle>
              </DialogHeader>
              <TodoForm onSubmitted={() => { /* Dialog will close automatically if trigger unmounts */ }} />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Ειδοποιήσεις TODO">
                <Bell className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Ειδοποιήσεις</DialogTitle>
              </DialogHeader>
              <TodoNotifications />
            </DialogContent>
          </Dialog>
          <button onClick={close} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Κλείσιμο">
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Filters quick bar */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-800 text-xs">
        <button
          className={[
            'px-2 py-1 rounded',
            filter === 'all' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick={() => setFilter('all')}
        >
          Όλα
        </button>
        <button
          className={[
            'px-2 py-1 rounded',
            filter === 'pending' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick={() => setFilter('pending')}
        >
          Εκκρεμή
        </button>
        <button
          className={[
            'px-2 py-1 rounded inline-flex items-center gap-1',
            filter === 'due_soon' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick={() => setFilter('due_soon')}
        >
          <Clock className="w-3 h-3 text-amber-600" /> Σύντομα
        </button>
        <button
          className={[
            'px-2 py-1 rounded inline-flex items-center gap-1',
            filter === 'overdue' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick={() => setFilter('overdue')}
        >
          <AlertTriangle className="w-3 h-3 text-red-600" /> Ληγμένα
        </button>
        <button
          className={[
            'px-2 py-1 rounded inline-flex items-center gap-1',
            filter === 'maintenance' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick={() => setFilter('maintenance')}
        >
          <Wrench className="w-3 h-3 text-orange-600" /> Συντηρήσεις
        </button>
        <button
          className={[
            'px-2 py-1 rounded inline-flex items-center gap-1',
            filter === 'financial' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick={() => setFilter('financial')}
        >
          <BadgeAlert className="w-3 h-3 text-fuchsia-700" /> Οφειλές
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <TodoList todos={todos} isLoading={isLoading} />
      </div>
    </aside>
  );
}


