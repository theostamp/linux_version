'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  X,
  BellOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReminderBadge, useTodoNotifications, TodoNotification } from '@/hooks/useTodoNotifications';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TodoReminderDropdownProps {
  onOpenCalendar?: () => void;
  className?: string;
}

const notificationTypeConfig = {
  overdue: {
    label: 'Εκπρόθεσμο',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  due_soon: {
    label: 'Λήγει σύντομα',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  completed: {
    label: 'Ολοκληρώθηκε',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  assigned: {
    label: 'Ανατέθηκε',
    icon: Bell,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  reminder: {
    label: 'Υπενθύμιση',
    icon: Bell,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
};

export function TodoReminderDropdown({ onOpenCalendar, className }: TodoReminderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    total,
    overdueCount,
    dueSoonCount,
    notifications,
    isLoading,
  } = useReminderBadge();

  const { markAsRead, markAllAsRead, isMarkingRead } = useTodoNotifications();

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleOpenCalendar = () => {
    setIsOpen(false);
    if (onOpenCalendar) {
      onOpenCalendar();
    } else {
      // Default: open in new window
      const calendarUrl = `${window.location.protocol}//${window.location.host}/calendar`;
      window.open(calendarUrl, 'calendar', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200',
            total > 0 && 'text-primary',
            className
          )}
          title="Υπενθυμίσεις"
        >
          <Bell className="w-5 h-5" />
          
          {/* Badge */}
          {total > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1',
                'text-[10px] font-bold rounded-full',
                overdueCount > 0
                  ? 'bg-red-500 text-white'
                  : dueSoonCount > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-primary text-primary-foreground'
              )}
            >
              {total > 99 ? '99+' : total}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Υπενθυμίσεις</h3>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingRead}
              >
                Επισήμανση όλων
              </Button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {total > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 border-b text-xs">
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overdueCount} εκπρόθεσμα
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <Clock className="w-3.5 h-3.5" />
                {dueSoonCount} σύντομα
              </span>
            )}
          </div>
        )}

        {/* Notifications list */}
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BellOff className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">Δεν υπάρχουν υπενθυμίσεις</p>
              <p className="text-xs mt-1">Είστε ενημερωμένοι!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={(e) => handleMarkAsRead(e, notification.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-center gap-2 text-sm"
            onClick={handleOpenCalendar}
          >
            <ExternalLink className="w-4 h-4" />
            Άνοιγμα Ημερολογίου
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Individual notification item
function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: TodoNotification;
  onMarkAsRead: (e: React.MouseEvent) => void;
}) {
  const config = notificationTypeConfig[notification.notification_type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 p-2 rounded-full', config.bgColor)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm line-clamp-2',
          !notification.is_read && 'font-medium'
        )}>
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', config.bgColor, config.color)}>
            {config.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: el,
            })}
          </span>
        </div>
      </div>

      {/* Mark as read button */}
      {!notification.is_read && (
        <button
          onClick={onMarkAsRead}
          className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Επισήμανση ως αναγνωσμένο"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default TodoReminderDropdown;

