'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useEventsPendingCount } from '@/hooks/useEvents';

interface EventNotificationBellProps {
  className?: string;
  onClick: () => void;
}

export default function EventNotificationBell({ className, onClick }: EventNotificationBellProps) {
  const { selectedBuilding } = useBuilding();
  const { data: pendingCount = 0 } = useEventsPendingCount(selectedBuilding?.id);

  const hasUnread = pendingCount > 0;

  return (
    <button
      onClick={onClick}
      className={[
        'relative p-2 rounded-lg transition-all duration-200',
        'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400',
        'hover:bg-blue-50 dark:hover:bg-blue-900/20',
        className || '',
      ].join(' ')}
      title={hasUnread ? `Εκκρεμή συμβάντα: ${pendingCount}` : 'Συμβάντα'}
    >
      <Bell className="w-5 h-5" />
      {hasUnread && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center text-[10px] font-bold text-white bg-red-600 rounded-full min-w-[16px] h-[16px] px-1 shadow">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </button>
  );
}