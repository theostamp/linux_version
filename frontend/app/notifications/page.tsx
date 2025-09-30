'use client';

/**
 * Notifications History Page
 * Lists all sent notifications with filtering and statistics
 */
import { useState } from 'react';
import { useNotifications, useNotificationStats } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, MessageSquare, Send, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import type { NotificationStatus, NotificationType, NotificationPriority } from '@/types/notifications';

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data: notifications, isLoading } = useNotifications({
    status: statusFilter || undefined,
    notification_type: typeFilter || undefined,
  });

  const { data: stats } = useNotificationStats();

  /**
   * Get status badge color
   */
  const getStatusBadge = (status: NotificationStatus) => {
    const variants: Record<NotificationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      scheduled: 'secondary',
      sending: 'default',
      sent: 'default',
      failed: 'destructive',
    };

    const icons: Record<NotificationStatus, React.ReactNode> = {
      draft: <Clock className="w-3 h-3 mr-1" />,
      scheduled: <Clock className="w-3 h-3 mr-1" />,
      sending: <Send className="w-3 h-3 mr-1 animate-pulse" />,
      sent: <CheckCircle2 className="w-3 h-3 mr-1" />,
      failed: <XCircle className="w-3 h-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status]} className="flex items-center">
        {icons[status]}
        {status === 'draft' && 'Πρόχειρο'}
        {status === 'scheduled' && 'Προγραμματισμένο'}
        {status === 'sending' && 'Αποστολή'}
        {status === 'sent' && 'Στάλθηκε'}
        {status === 'failed' && 'Αποτυχία'}
      </Badge>
    );
  };

  /**
   * Get type icon
   */
  const getTypeIcon = (type: NotificationType) => {
    if (type === 'email') return <Mail className="w-4 h-4" />;
    if (type === 'sms') return <MessageSquare className="w-4 h-4" />;
    return (
      <>
        <Mail className="w-4 h-4" />
        <MessageSquare className="w-4 h-4 ml-1" />
      </>
    );
  };

  /**
   * Format delivery rate
   */
  const formatDeliveryRate = (rate: number) => {
    if (rate >= 90) return <span className="text-green-600 font-semibold">{rate.toFixed(1)}%</span>;
    if (rate >= 70) return <span className="text-yellow-600 font-semibold">{rate.toFixed(1)}%</span>;
    return <span className="text-red-600 font-semibold">{rate.toFixed(1)}%</span>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ειδοποιήσεις</h1>
          <p className="text-muted-foreground">
            Ιστορικό αποσταλμένων ειδοποιήσεων Email & SMS
          </p>
        </div>

        <Link href="/notifications/send">
          <Button size="lg">
            <Send className="w-4 h-4 mr-2" />
            Νέα Ειδοποίηση
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Σύνολο</p>
                <p className="text-2xl font-bold">{stats.total_notifications}</p>
              </div>
              <Send className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Επιτυχείς</p>
                <p className="text-2xl font-bold text-green-600">{stats.total_sent}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Αποτυχίες</p>
                <p className="text-2xl font-bold text-red-600">{stats.total_failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Μέσος Όρος Παράδοσης</p>
                <p className="text-2xl font-bold">
                  {formatDeliveryRate(stats.average_delivery_rate)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Όλες οι καταστάσεις" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Όλες</SelectItem>
                <SelectItem value="sent">Στάλθηκαν</SelectItem>
                <SelectItem value="scheduled">Προγραμματισμένες</SelectItem>
                <SelectItem value="sending">Σε αποστολή</SelectItem>
                <SelectItem value="failed">Αποτυχίες</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Όλοι οι τύποι" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Όλοι</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="both">Email & SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(statusFilter || typeFilter) && (
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
              }}
            >
              Καθαρισμός
            </Button>
          )}
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {isLoading && (
          <Card className="p-8 text-center text-muted-foreground">
            Φόρτωση...
          </Card>
        )}

        {!isLoading && notifications && notifications.length === 0 && (
          <Card className="p-8 text-center">
            <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold">Δεν βρέθηκαν ειδοποιήσεις</p>
            <p className="text-muted-foreground mb-4">
              Δημιουργήστε την πρώτη σας ειδοποίηση
            </p>
            <Link href="/notifications/send">
              <Button>Νέα Ειδοποίηση</Button>
            </Link>
          </Card>
        )}

        {notifications?.map((notification) => (
          <Link key={notification.id} href={`/notifications/${notification.id}`}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center text-muted-foreground">
                      {getTypeIcon(notification.notification_type)}
                    </div>
                    {getStatusBadge(notification.status)}
                    {notification.priority === 'urgent' && (
                      <Badge variant="destructive">Επείγον</Badge>
                    )}
                    {notification.priority === 'high' && (
                      <Badge variant="default">Υψηλή Προτεραιότητα</Badge>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold mb-1">
                    {notification.subject}
                  </h3>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {notification.body.substring(0, 150)}...
                  </p>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>
                      👤 {notification.created_by_name}
                    </span>
                    <span>
                      📅 {new Date(notification.created_at).toLocaleDateString('el-GR')}
                    </span>
                    {notification.sent_at && (
                      <span>
                        🕐 {new Date(notification.sent_at).toLocaleTimeString('el-GR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right ml-6">
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">Παραλήπτες</p>
                    <p className="text-2xl font-bold">{notification.total_recipients}</p>
                  </div>

                  {notification.status === 'sent' && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">
                        ✅ {notification.successful_sends}
                      </span>
                      {notification.failed_sends > 0 && (
                        <span className="text-red-600">
                          ❌ {notification.failed_sends}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        ({formatDeliveryRate(notification.delivery_rate)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}