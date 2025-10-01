'use client';

/**
 * Notification Detail Page
 * Shows notification details and recipient status
 */
import { use } from 'react';
import { useNotification, useResendNotification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  MousePointerClick,
} from 'lucide-react';
import Link from 'next/link';
import type { RecipientStatus } from '@/types/notifications';

export default function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const notificationId = parseInt(resolvedParams.id);

  const { data: notification, isLoading } = useNotification(notificationId);
  const resendMutation = useResendNotification();

  /**
   * Get recipient status badge
   */
  const getRecipientStatusBadge = (status: RecipientStatus) => {
    const variants: Record<RecipientStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      sending: 'default',
      sent: 'secondary',
      delivered: 'default',
      failed: 'destructive',
      bounced: 'destructive',
    };

    return (
      <Badge variant={variants[status]}>
        {status === 'pending' && 'Εκκρεμεί'}
        {status === 'sending' && 'Αποστέλλεται'}
        {status === 'sent' && 'Στάλθηκε'}
        {status === 'delivered' && 'Παραδόθηκε'}
        {status === 'failed' && 'Αποτυχία'}
        {status === 'bounced' && 'Επιστράφηκε'}
      </Badge>
    );
  };

  /**
   * Handle resend failed
   */
  const handleResend = () => {
    if (confirm('Θέλετε να επαναστείλετε τις αποτυχημένες ειδοποιήσεις;')) {
      resendMutation.mutate(notificationId);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <Card className="p-8 text-center">Φόρτωση...</Card>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="w-full">
        <Card className="p-8 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-semibold">Η ειδοποίηση δεν βρέθηκε</p>
          <Link href="/notifications">
            <Button className="mt-4">Επιστροφή</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const hasFailedRecipients = notification.failed_sends > 0;

  return (
    <div className="w-full space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/notifications">
            <Button variant="outline" size="icon" className="hover:bg-muted/50 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-heading font-bold tracking-tight text-foreground">
              {notification.subject}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Δημιουργήθηκε από {notification.created_by_name} στις{' '}
              {new Date(notification.created_at).toLocaleString('el-GR')}
            </p>
          </div>
        </div>

        {hasFailedRecipients && notification.status === 'sent' && (
          <Button
            onClick={handleResend}
            disabled={resendMutation.isPending}
            className="bg-gradient-warning hover:shadow-lg transition-all duration-300"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                resendMutation.isPending ? 'animate-spin' : ''
              }`}
            />
            Επαναποστολή Αποτυχιών
          </Button>
        )}
      </div>

      {/* Notification Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-border/50">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Τύπος</p>
            <div className="flex items-center gap-3">
              {notification.notification_type === 'email' && (
                <>
                  <div className="p-2 rounded-full bg-primary/10">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-lg font-heading font-semibold text-foreground">Email</span>
                </>
              )}
              {notification.notification_type === 'sms' && (
                <>
                  <div className="p-2 rounded-full bg-accent/10">
                    <MessageSquare className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-lg font-heading font-semibold text-foreground">SMS</span>
                </>
              )}
              {notification.notification_type === 'both' && (
                <>
                  <div className="p-2 rounded-full bg-primary/10">
                    <Mail className="w-5 h-5 text-primary" />
                    <MessageSquare className="w-5 h-5 text-accent ml-1" />
                  </div>
                  <span className="text-lg font-heading font-semibold text-foreground">Email & SMS</span>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-border/50">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Κατάσταση</p>
            <div className="flex items-center gap-3">
              {notification.status === 'sent' && (
                <div className="p-2 rounded-full bg-success/10">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
              )}
              {notification.status === 'failed' && (
                <div className="p-2 rounded-full bg-destructive/10">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
              )}
              {notification.status === 'sending' && (
                <div className="p-2 rounded-full bg-primary/10">
                  <Clock className="w-5 h-5 text-primary animate-pulse" />
                </div>
              )}
              <span className="text-lg font-heading font-semibold text-foreground">{notification.status_display}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-border/50">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Προτεραιότητα</p>
            <Badge
              variant={notification.priority === 'urgent' ? 'destructive' : 'default'}
              className="text-sm font-medium px-3 py-1"
            >
              {notification.priority_display}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Delivery Statistics */}
      <Card className="p-8 bg-gradient-to-br from-card to-surface border-border/50">
        <h2 className="text-2xl font-heading font-semibold text-foreground mb-6">Στατιστικά Παράδοσης</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-sm font-medium text-muted-foreground mb-2">Σύνολο Παραληπτών</p>
            <p className="text-3xl font-heading font-bold text-foreground">{notification.total_recipients}</p>
          </div>
          <div className="p-6 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm font-medium text-muted-foreground mb-2">Επιτυχείς</p>
            <p className="text-3xl font-heading font-bold text-success">
              {notification.successful_sends}
            </p>
          </div>
          <div className="p-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-muted-foreground mb-2">Αποτυχίες</p>
            <p className="text-3xl font-heading font-bold text-destructive">
              {notification.failed_sends}
            </p>
          </div>
          <div className="p-6 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm font-medium text-muted-foreground mb-2">Ποσοστό Επιτυχίας</p>
            <p className="text-3xl font-heading font-bold text-primary">
              {notification.delivery_rate.toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Message Content */}
      <Card className="p-8 bg-gradient-to-br from-card to-surface border-border/50">
        <h2 className="text-2xl font-heading font-semibold text-foreground mb-6">Περιεχόμενο Μηνύματος</h2>

        {notification.notification_type !== 'sms' && (
          <div className="mb-8">
            <h3 className="text-xl font-heading font-semibold text-foreground mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-3 text-primary" />
              Email
            </h3>
            <div className="bg-muted/50 p-6 rounded-lg border border-border/30 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Θέμα:</p>
                <p className="text-lg font-semibold text-foreground">{notification.subject}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Περιεχόμενο:</p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-background/50 p-4 rounded-md border border-border/20">
                  {notification.body}
                </div>
              </div>
            </div>
          </div>
        )}

        {notification.notification_type !== 'email' && notification.sms_body && (
          <div>
            <h3 className="text-xl font-heading font-semibold text-foreground mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-3 text-accent" />
              SMS
            </h3>
            <div className="bg-muted/50 p-6 rounded-lg border border-border/30 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Κείμενο:</p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-background/50 p-4 rounded-md border border-border/20">
                  {notification.sms_body}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Χαρακτήρες: {notification.sms_body.length} / 160
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Recipients Table */}
      {notification.recipients && notification.recipients.length > 0 && (
        <Card className="p-8 bg-gradient-to-br from-card to-surface border-border/50">
          <h2 className="text-2xl font-heading font-semibold text-foreground mb-6">
            Παραλήπτες ({notification.recipients.length})
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-sm font-medium text-foreground">Διαμέρισμα</TableHead>
                  <TableHead className="text-sm font-medium text-foreground">Όνομα</TableHead>
                  <TableHead className="text-sm font-medium text-foreground">Email</TableHead>
                  <TableHead className="text-sm font-medium text-foreground">Τηλέφωνο</TableHead>
                  <TableHead className="text-sm font-medium text-foreground">Κατάσταση</TableHead>
                  <TableHead className="text-sm font-medium text-foreground">Ημ/νία Αποστολής</TableHead>
                  <TableHead className="text-sm font-medium text-foreground">Engagement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notification.recipients.map((recipient) => (
                  <TableRow key={recipient.id} className="border-border/20 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-foreground">
                      {recipient.apartment_number}
                    </TableCell>
                    <TableCell className="text-foreground">{recipient.recipient_name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {recipient.email || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {recipient.phone || '-'}
                    </TableCell>
                    <TableCell>{getRecipientStatusBadge(recipient.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {recipient.sent_at
                        ? new Date(recipient.sent_at).toLocaleString('el-GR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {recipient.opened_at && (
                          <Badge variant="outline" className="flex items-center gap-1 border-success/20 text-success">
                            <Eye className="w-3 h-3" />
                            Opened
                          </Badge>
                        )}
                        {recipient.clicked_at && (
                          <Badge variant="outline" className="flex items-center gap-1 border-primary/20 text-primary">
                            <MousePointerClick className="w-3 h-3" />
                            Clicked
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {notification.error_message && (
        <Card className="p-8 bg-destructive/10 border-destructive/20 border-2">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-destructive/20">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-heading font-semibold text-destructive">Σφάλμα</h2>
              <p className="text-destructive/80 leading-relaxed">{notification.error_message}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}