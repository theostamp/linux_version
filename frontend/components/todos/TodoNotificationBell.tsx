'use client';

import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useTodoSidebar } from './TodoSidebarContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useTodoPendingCount } from '@/hooks/useTodos';

type Props = {
  className?: string;
};

export default function TodoNotificationBell({ className }: Props) {
  const { toggle, pendingCount, setPendingCount } = useTodoSidebar();
  const { selectedBuilding } = useBuilding();

  const { data: serverCount, error, isLoading } = useTodoPendingCount(selectedBuilding?.id);

  useEffect(() => {
    if (typeof serverCount === 'number') {
      setPendingCount(serverCount);
    } else if (error) {
      // If there's an error (like 403), set count to 0 to avoid hanging
      console.warn('[TodoNotificationBell] Error fetching pending count:', error);
      setPendingCount(0);
    }
  }, [serverCount, error, setPendingCount]);

  const count = pendingCount;
  const hasUnread = count > 0;

  return (
    <button
      onClick={toggle}
      className={[
        'relative p-2 rounded-lg transition-all duration-200',
        'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400',
        'hover:bg-blue-50 dark:hover:bg-blue-900/20',
        className || '',
      ].join(' ')}
      title={hasUnread ? `Εκκρεμότητες: ${count}` : 'Ειδοποιήσεις TODO'}
    >
      <Bell className="w-5 h-5" />
      {hasUnread && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center text-[10px] font-bold text-white bg-red-600 rounded-full min-w-[16px] h-[16px] px-1 shadow">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}


