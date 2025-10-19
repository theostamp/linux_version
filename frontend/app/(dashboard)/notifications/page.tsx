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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: notifications, isLoading } = useNotifications({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    notification_type: typeFilter !== 'all' ? typeFilter : undefined,
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
    <div className="w-full space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-heading font-bold tracking-tight text-foreground">
            Ειδοποιήσεις
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Ιστορικό αποσταλμένων ειδοποιήσεων Email & SMS
          </p>
        </div>

        <Link href="/notifications/send">
          <Button size="lg" className="bg-gradient-primary hover:shadow-lg transition-all duration-300">
            <Send className="w-4 h-4 mr-2" />
            Νέα Ειδοποίηση
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Σύνολο</p>
                <p className="text-3xl font-heading font-bold text-foreground">{stats.total_notifications}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Send className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Επιτυχείς</p>
                <p className="text-3xl font-heading font-bold text-success">{stats.total_sent}</p>
              </div>
              <div className="p-3 rounded-full bg-success/10">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Αποτυχίες</p>
                <p className="text-3xl font-heading font-bold text-destructive">{stats.total_failed}</p>
              </div>
              <div className="p-3 rounded-full bg-destructive/10">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Μέσος Όρος Παράδοσης</p>
                <p className="text-3xl font-heading font-bold">
                  {formatDeliveryRate(stats.average_delivery_rate)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6 bg-gradient-to-br from-card to-surface border-gray-200/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Κατάσταση
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background/50 border-gray-200/50">
                <SelectValue placeholder="Όλες οι καταστάσεις" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλες</SelectItem>
                <SelectItem value="sent">Στάλθηκαν</SelectItem>
                <SelectItem value="scheduled">Προγραμματισμένες</SelectItem>
                <SelectItem value="sending">Σε αποστολή</SelectItem>
                <SelectItem value="failed">Αποτυχίες</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Τύπος
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-background/50 border-gray-200/50">
                <SelectValue placeholder="Όλοι οι τύποι" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλοι</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="both">Email & SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="bg-background/50 border-gray-200/50 hover:bg-muted/50"
              >
                Καθαρισμός
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-6">
        {isLoading && (
          <Card className="p-12 text-center bg-gradient-to-br from-card to-surface border-gray-200/50">
            <div className="animate-pulse">
              <div className="w-12 h-12 mx-auto mb-4 bg-muted rounded-full"></div>
              <p className="text-lg font-medium text-muted-foreground">Φόρτωση...</p>
            </div>
          </Card>
        )}

        {!isLoading && notifications && notifications.length === 0 && (
          <Card className="p-12 text-center bg-gradient-to-br from-card to-surface border-gray-200/50">
            <div className="space-y-4">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto">
                <Send className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-heading font-semibold text-foreground">
                  Δεν βρέθηκαν ειδοποιήσεις
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Δημιουργήστε την πρώτη σας ειδοποίηση
                </p>
              </div>
              <Link href="/notifications/send">
                <Button className="bg-gradient-primary hover:shadow-lg transition-all duration-300">
                  Νέα Ειδοποίηση
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {Array.isArray(notifications) && notifications.map((notification, index) => (
          <Link key={notification.id} href={`/notifications/${notification.id}`}>
            <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50 cursor-pointer transition-all duration-300 group">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center text-muted-foreground p-2 rounded-lg bg-muted/50">
                      {getTypeIcon(notification.notification_type)}
                    </div>
                    {getStatusBadge(notification.status)}
                    {notification.priority === 'urgent' && (
                      <Badge variant="destructive" className="animate-pulse">Επείγον</Badge>
                    )}
                    {notification.priority === 'high' && (
                      <Badge variant="default">Υψηλή Προτεραιότητα</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                      {notification.subject}
                    </h3>

                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {notification.body.substring(0, 150)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      {notification.created_by_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                      {new Date(notification.created_at).toLocaleDateString('el-GR')}
                    </span>
                    {notification.sent_at && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                        {new Date(notification.sent_at).toLocaleTimeString('el-GR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-3 min-w-[120px]">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Παραλήπτες</p>
                    <p className="text-2xl font-heading font-bold text-foreground">{notification.total_recipients}</p>
                  </div>

                  {notification.status === 'sent' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-end gap-2 text-sm">
                        <span className="text-success font-medium">
                          ✅ {notification.successful_sends}
                        </span>
                        {notification.failed_sends > 0 && (
                          <span className="text-destructive font-medium">
                            ❌ {notification.failed_sends}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">
                          ({formatDeliveryRate(notification.delivery_rate)})
                        </span>
                      </div>
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