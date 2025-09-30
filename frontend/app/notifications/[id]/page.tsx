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
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">Φόρτωση...</Card>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/notifications">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{notification.subject}</h1>
            <p className="text-muted-foreground">
              Δημιουργήθηκε από {notification.created_by_name} στις{' '}
              {new Date(notification.created_at).toLocaleString('el-GR')}
            </p>
          </div>
        </div>

        {hasFailedRecipients && notification.status === 'sent' && (
          <Button
            onClick={handleResend}
            disabled={resendMutation.isPending}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Τύπος</p>
          <div className="flex items-center gap-2">
            {notification.notification_type === 'email' && (
              <>
                <Mail className="w-4 h-4" />
                <span className="font-semibold">Email</span>
              </>
            )}
            {notification.notification_type === 'sms' && (
              <>
                <MessageSquare className="w-4 h-4" />
                <span className="font-semibold">SMS</span>
              </>
            )}
            {notification.notification_type === 'both' && (
              <>
                <Mail className="w-4 h-4" />
                <MessageSquare className="w-4 h-4" />
                <span className="font-semibold">Email & SMS</span>
              </>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Κατάσταση</p>
          <div className="flex items-center gap-2">
            {notification.status === 'sent' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            {notification.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
            {notification.status === 'sending' && <Clock className="w-4 h-4 text-blue-500 animate-pulse" />}
            <span className="font-semibold">{notification.status_display}</span>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Προτεραιότητα</p>
          <Badge
            variant={notification.priority === 'urgent' ? 'destructive' : 'default'}
          >
            {notification.priority_display}
          </Badge>
        </Card>
      </div>

      {/* Delivery Statistics */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Στατιστικά Παράδοσης</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Σύνολο Παραληπτών</p>
            <p className="text-3xl font-bold">{notification.total_recipients}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Επιτυχείς</p>
            <p className="text-3xl font-bold text-green-600">
              {notification.successful_sends}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Αποτυχίες</p>
            <p className="text-3xl font-bold text-red-600">
              {notification.failed_sends}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ποσοστό Επιτυχίας</p>
            <p className="text-3xl font-bold">
              {notification.delivery_rate.toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Message Content */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Περιεχόμενο Μηνύματος</h2>

        {notification.notification_type !== 'sms' && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2 flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </h3>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold mb-2">{notification.subject}</p>
              <div className="whitespace-pre-wrap text-sm">{notification.body}</div>
            </div>
          </div>
        )}

        {notification.notification_type !== 'email' && notification.sms_body && (
          <div>
            <h3 className="font-semibold mb-2 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </h3>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{notification.sms_body}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Χαρακτήρες: {notification.sms_body.length} / 160
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Recipients Table */}
      {notification.recipients && notification.recipients.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Παραλήπτες ({notification.recipients.length})
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Διαμέρισμα</TableHead>
                  <TableHead>Όνομα</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Τηλέφωνο</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                  <TableHead>Ημ/νία Αποστολής</TableHead>
                  <TableHead>Engagement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notification.recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">
                      {recipient.apartment_number}
                    </TableCell>
                    <TableCell>{recipient.recipient_name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {recipient.email || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {recipient.phone || '-'}
                    </TableCell>
                    <TableCell>{getRecipientStatusBadge(recipient.status)}</TableCell>
                    <TableCell>
                      {recipient.sent_at
                        ? new Date(recipient.sent_at).toLocaleString('el-GR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {recipient.opened_at && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Opened
                          </Badge>
                        )}
                        {recipient.clicked_at && (
                          <Badge variant="outline" className="flex items-center gap-1">
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
        <Card className="p-6 border-red-200 bg-red-50">
          <h2 className="text-xl font-semibold mb-2 text-red-700">Σφάλμα</h2>
          <p className="text-red-600">{notification.error_message}</p>
        </Card>
      )}
    </div>
  );
}