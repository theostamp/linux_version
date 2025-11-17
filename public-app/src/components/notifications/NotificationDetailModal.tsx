'use client';

import { useQuery } from '@tanstack/react-query';
import { Mail, MessageSquare, Bell, Send, AlertTriangle, CalendarDays, User } from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import type { Notification, NotificationRecipient } from '@/types/notifications';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
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

const recipientStatusStyles: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  bounced: 'bg-red-200 text-red-800',
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

interface NotificationDetailModalProps {
  notificationId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NotificationDetailModal({
  notificationId,
  open,
  onOpenChange,
}: NotificationDetailModalProps) {
  const {
    data: notification,
    isLoading,
    isError,
  } = useQuery<Notification>({
    queryKey: ['notification', notificationId],
    queryFn: () => notificationsApi.get(notificationId!),
    enabled: !!notificationId && open,
    staleTime: 5 * 60 * 1000,
  });

  if (!notificationId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {typeIcons[notification?.notification_type || 'email']}
            <span>Λεπτομέρειες Ειδοποίησης</span>
          </DialogTitle>
          <DialogDescription>
            Πλήρης προβολή της ειδοποίησης και των παραληπτών
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center">Φόρτωση...</div>
        ) : isError || !notification ? (
          <div className="p-8 text-center text-red-500">
            Σφάλμα φόρτωσης ειδοποίησης
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {notification.subject}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('capitalize', statusStyles[notification.status])}>
                    {notification.status_display}
                  </Badge>
                  <Badge className={cn(priorityStyles[notification.priority])}>
                    {notification.priority_display}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {typeIcons[notification.notification_type]}
                    {notification.notification_type_display}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span>
                    <strong>Δημιουργήθηκε από:</strong> {notification.created_by_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    <strong>Ημερομηνία:</strong> {formatDateTime(notification.created_at)}
                  </span>
                </div>
                {notification.scheduled_at && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      <strong>Προγραμματισμένη:</strong>{' '}
                      {formatDateTime(notification.scheduled_at)}
                    </span>
                  </div>
                )}
                {notification.sent_at && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Send className="h-4 w-4" />
                    <span>
                      <strong>Στάλθηκε:</strong> {formatDateTime(notification.sent_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Στατιστικά</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {notification.total_recipients}
                    </div>
                    <div className="text-sm text-gray-500">Συνολικοί Παραλήπτες</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {notification.successful_sends}
                    </div>
                    <div className="text-sm text-gray-500">Επιτυχείς</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {notification.failed_sends}
                    </div>
                    <div className="text-sm text-gray-500">Αποτυχίες</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Ποσοστό Επιτυχίας</span>
                    <span className="font-semibold">
                      {Math.round(notification.delivery_rate)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${notification.delivery_rate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Περιεχόμενο</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Email Body</h4>
                  <div className="p-4 bg-slate-50 rounded border whitespace-pre-wrap text-sm">
                    {notification.body}
                  </div>
                </div>
                {notification.sms_body && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">SMS Body</h4>
                    <div className="p-4 bg-slate-50 rounded border text-sm">
                      {notification.sms_body}
                    </div>
                  </div>
                )}
                {notification.error_message && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Σφάλμα
                    </h4>
                    <div className="p-4 bg-red-50 rounded border border-red-200 text-sm text-red-800">
                      {notification.error_message}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recipients */}
            {notification.recipients && notification.recipients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Παραλήπτες ({notification.recipients.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notification.recipients.map((recipient: NotificationRecipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-3 border rounded hover:bg-slate-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {recipient.recipient_name || recipient.apartment_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {recipient.email} {recipient.phone && `· ${recipient.phone}`}
                          </div>
                          {recipient.error_message && (
                            <div className="text-xs text-red-600 mt-1">
                              {recipient.error_message}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              'capitalize',
                              recipientStatusStyles[recipient.status]
                            )}
                          >
                            {recipient.status_display}
                          </Badge>
                          {recipient.sent_at && (
                            <span className="text-xs text-gray-500">
                              {formatDateTime(recipient.sent_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

