'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useMarkNotificationAsRead, useTodoNotifications, useTriggerTodoReminders, useTriggerTemplateAutoCreate } from '@/hooks/useTodos';
import { toast } from '@/hooks/use-toast';

export default function TodoNotifications() {
  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id ?? undefined;
  const { data: unread = [], isLoading, refetch } = useTodoNotifications(buildingId, false);
  const { data: read = [] } = useTodoNotifications(buildingId, true);
  const markRead = useMarkNotificationAsRead();
  const triggerReminders = useTriggerTodoReminders();
  const triggerAutoCreate = useTriggerTemplateAutoCreate();

  const onMarkRead = async (id: number) => {
    await markRead.mutateAsync({ id });
    await refetch();
  };

  const onTriggerReminders = async () => {
    const res = await triggerReminders.mutateAsync({ buildingId });
    toast({ title: 'Υπενθυμίσεις', description: `Δημιουργήθηκαν: ${res.created}, Προσπεράστηκαν: ${res.skipped}` });
    await refetch();
  };

  const onTriggerAutoCreate = async () => {
    const res = await triggerAutoCreate.mutateAsync({ buildingId });
    toast({ title: 'Πρότυπα', description: `Ελέγχθηκαν: ${res.checked}, Δημιουργήθηκαν: ${res.created}` });
  };

  return (
    <div className="space-y-4">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Μη αναγνωσμένες</h4>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onTriggerReminders} disabled={triggerReminders.isPending}>
              Δημιουργία υπενθυμίσεων
            </Button>
            <Button size="sm" variant="secondary" onClick={onTriggerAutoCreate} disabled={triggerAutoCreate.isPending}>
              Δημιουργία από πρότυπα
            </Button>
          </div>
        </div>
        {isLoading ? (
          <p className="text-xs text-gray-500">Φόρτωση...</p>
        ) : (
          <ul className="space-y-2">
            {unread.map((n) => (
              <li key={n.id} className="p-2 rounded border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{n.notification_type}</span>
                  {n.message ? <span className="ml-2 text-gray-600 dark:text-gray-300">{n.message}</span> : null}
                  <span className="ml-2 text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <Button size="sm" onClick={() => onMarkRead(n.id)} disabled={markRead.isPending}>Σήμανση ως διαβασμένη</Button>
              </li>
            ))}
            {unread.length === 0 && (
              <li className="text-xs text-gray-500">Καμία μη αναγνωσμένη ειδοποίηση.</li>
            )}
          </ul>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Αναγνωσμένες</h4>
        <ul className="space-y-2 max-h-64 overflow-auto pr-1">
          {read.map((n) => (
            <li key={n.id} className="p-2 rounded border border-gray-200 dark:border-gray-800">
              <div className="text-sm">
                <span className="font-medium">{n.notification_type}</span>
                {n.message ? <span className="ml-2 text-gray-600 dark:text-gray-300">{n.message}</span> : null}
                <span className="ml-2 text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</span>
              </div>
            </li>
          ))}
          {read.length === 0 && (
            <li className="text-xs text-gray-500">Δεν υπάρχουν αναγνωσμένες ειδοποιήσεις.</li>
          )}
        </ul>
      </section>
    </div>
  );
}


