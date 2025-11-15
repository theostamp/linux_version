'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  RefreshCw,
  Send,
  Inbox,
  AlertTriangle,
  CalendarDays,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { notificationsApi, notificationEventsApi } from '@/lib/api/notifications';
import type { Notification, NotificationEvent, NotificationStatus } from '@/types/notifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import ErrorMessage from '@/components/ErrorMessage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const statusStyles: Record<NotificationStatus, string> = {
  draft: 'bg-slate-200 text-slate-700',
  scheduled: 'bg-amber-100 text-amber-800',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-indigo-100 text-indigo-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const typeIcons: Record<string, JSX.Element> = {
  email: <Mail className="w-4 h-4 text-blue-500" />,
  sms: <MessageSquare className="w-4 h-4 text-green-500" />,
  both: <Bell className="w-4 h-4 text-purple-500" />,
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('el-GR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
};

function NotificationsPageContent() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id ?? currentBuilding?.id ?? null;
  const buildingFilterKey = buildingId ?? 'all';

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    isError: notificationsError,
    refetch: refetchNotifications,
    isFetching: notificationsFetching,
  } = useQuery<Notification[]>({
    queryKey: ['notifications', buildingFilterKey],
    queryFn: async () => {
      const response = await notificationsApi.list(
        buildingId ? { building: buildingId } : undefined
      );
      return response as Notification[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ['notificationStats', buildingFilterKey],
    queryFn: () => notificationsApi.stats(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
    isFetching: eventsFetching,
  } = useQuery<NotificationEvent[]>({
    queryKey: ['notificationEvents', buildingFilterKey],
    queryFn: async () => {
      const response = await notificationEventsApi.list(
        buildingId ? { building: buildingId } : undefined
      );
      return response as NotificationEvent[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const refreshing = notificationsFetching || statsFetching || eventsFetching;

  const handleRefresh = () => {
    void Promise.all([refetchNotifications(), refetchStats(), refetchEvents()]);
  };

  const scheduledCount =
    (stats?.by_status?.scheduled || 0) + (stats?.by_status?.sending || 0);
  const failedCount = stats?.by_status?.failed || 0;

  const summaryCards = useMemo(() => {
    return [
      {
        title: 'Συνολικές Αποστολές',
        value: stats?.total_notifications ?? notifications.length ?? 0,
        description: `${stats?.total_recipients ?? 0} παραλήπτες`,
        icon: Send,
      },
      {
        title: 'Ποσοστό Επιτυχίας',
        value: `${Math.round(stats?.average_delivery_rate ?? 0)}%`,
        description: `${stats?.total_sent ?? 0} επιτυχείς παραδόσεις`,
        icon: Inbox,
      },
      {
        title: 'Σε Εξέλιξη / Αποτυχίες',
        value: `${scheduledCount} / ${failedCount}`,
        description: 'Προγραμματισμένες & αποτυχημένες αποστολές',
        icon: AlertTriangle,
      },
    ];
  }, [stats, notifications.length, scheduledCount, failedCount]);

  if ((notificationsError && statsError) || (!notificationsLoading && notifications.length === 0 && statsError)) {
    return (
      <div className="p-6">
        <ErrorMessage message="Δεν ήταν δυνατή η φόρτωση των ειδοποιήσεων. Παρακαλώ δοκιμάστε ξανά." />
      </div>
    );
  }

  const showGlobalLoading = notificationsLoading && statsLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ειδοποιήσεις & Ενημερώσεις</h1>
              <p className="text-sm text-gray-500">
                Παρακολούθηση όλων των email / SMS που αποστέλλονται στους κατοίκους
              </p>
            </div>
          </div>
          <BuildingFilterIndicator className="mt-3" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            {refreshing ? 'Ανανέωση...' : 'Ανανέωση'}
          </Button>
        </div>
      </div>

      {showGlobalLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx} className="animate-pulse border-dashed">
              <CardHeader>
                <div className="h-4 w-1/3 rounded bg-slate-200" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-1/2 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{card.title}</CardTitle>
                <card.icon className="h-5 w-5 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-sm text-gray-500">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Πρόσφατες Αποστολές</CardTitle>
              <p className="text-sm text-gray-500">
                Παρακολουθήστε την κατάσταση και την επιτυχία κάθε μαζικής ειδοποίησης
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="animate-pulse rounded-xl border p-4">
                    <div className="h-4 w-1/3 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">
                Δεν έχουν σταλεί ειδοποιήσεις για το επιλεγμένο κτίριο ακόμη.
              </div>
            ) : (
              notifications.slice(0, 6).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-base font-semibold text-gray-900">
                          {notification.subject}
                        </p>
                        {notification.template && (
                          <Badge variant="outline" className="text-xs">
                            Από πρότυπο #{notification.template}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Δημιουργήθηκε από {notification.created_by_name} ·{' '}
                        {formatDateTime(notification.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={cn('capitalize', statusStyles[notification.status])}>
                        {notification.status_display}
                      </Badge>
                      <Badge className={cn(priorityStyles[notification.priority])}>
                        {notification.priority_display}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      {typeIcons[notification.notification_type]}
                      <span>{notification.notification_type_display}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-indigo-500" />
                      <span>
                        {notification.successful_sends}/{notification.total_recipients} επιτυχείς
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>{notification.failed_sends} αποτυχίες</span>
                    </div>
                    {notification.scheduled_at && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-500" />
                        <span>Προγραμματισμένη: {formatDateTime(notification.scheduled_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ενεργά Συμβάντα</CardTitle>
              <p className="text-sm text-gray-500">
                Αυτοματοποιημένες ειδοποιήσεις που προκύπτουν από έργα, συνελεύσεις ή οικονομικά
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="animate-pulse rounded-lg border p-3">
                      <div className="h-4 w-1/2 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : eventsError ? (
                <p className="text-sm text-red-500">
                  Δεν ήταν δυνατή η φόρτωση των συμβάντων.
                </p>
              ) : events.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Δεν υπάρχουν πρόσφατα συμβάντα ειδοποιήσεων.
                </div>
              ) : (
                events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-slate-200 p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{event.icon || '🔔'}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{event.title}</p>
                          <p className="text-xs text-gray-500">
                            {event.event_type_display} · {formatDateTime(event.created_at)}
                          </p>
                        </div>
                      </div>
                      {event.is_urgent && (
                        <Badge className="bg-red-100 text-red-700">Επείγον</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                      {event.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="rounded-full bg-slate-100 px-2 py-1">
                        Δημιουργήθηκε: {formatDateTime(event.event_date || event.created_at)}
                      </span>
                      {event.is_pending && (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                          Δεν έχει σταλεί ακόμη
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Έξυπνες υπενθυμίσεις</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-gray-900">Καθημερινή επισκόπηση</p>
                <p className="text-xs text-gray-500">
                  Ελέγξτε τις αποτυχημένες αποστολές και προγραμματίστε επαναλήψεις.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-gray-900">Digest κατοίκων</p>
                <p className="text-xs text-gray-500">
                  Χρησιμοποιήστε τα συμβάντα για να στείλετε συνοπτική ενημέρωση στους κατοίκους.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <NotificationsPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}
