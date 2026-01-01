'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Mail,
  MessageSquare,
  Phone,
  Bell,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  viber: Phone,
  push: Bell,
  both: Mail,
  all: BarChart3,
};

const CHANNEL_COLORS = {
  email: 'text-blue-600 bg-blue-100',
  sms: 'text-green-600 bg-green-100',
  viber: 'text-purple-600 bg-purple-100',
  push: 'text-orange-600 bg-orange-100',
  both: 'text-indigo-600 bg-indigo-100',
  all: 'text-gray-600 bg-gray-100',
};

export default function NotificationAnalytics() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['notificationStats'],
    queryFn: () => notificationsApi.stats(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Αναλυτικά Στοιχεία</h2>
          <p className="text-sm text-gray-500">Φόρτωση στατιστικών...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Αναλυτικά Στοιχεία</h2>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center text-red-600">
            Δεν ήταν δυνατή η φόρτωση των στατιστικών
          </CardContent>
        </Card>
      </div>
    );
  }

  const deliveryRate = stats.average_delivery_rate || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Αναλυτικά Στοιχεία</h2>
        <p className="text-sm text-gray-500">
          Επισκόπηση απόδοσης ειδοποιήσεων
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Συνολικές Αποστολές</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total_notifications}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Επιτυχείς</p>
                <p className="text-3xl font-bold text-green-900">{stats.total_sent}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Αποτυχημένες</p>
                <p className="text-3xl font-bold text-red-900">{stats.total_failed}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Ποσοστό Επιτυχίας</p>
                <p className="text-3xl font-bold text-purple-900">{Math.round(deliveryRate)}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Ανά Κανάλι
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.by_type && Object.entries(stats.by_type).length > 0 ? (
              Object.entries(stats.by_type).map(([type, count]) => {
                const Icon = CHANNEL_ICONS[type as keyof typeof CHANNEL_ICONS] || Mail;
                const colorClass = CHANNEL_COLORS[type as keyof typeof CHANNEL_COLORS] || CHANNEL_COLORS.email;
                const percentage = stats.total_notifications > 0
                  ? Math.round((Number(count) / stats.total_notifications) * 100)
                  : 0;

                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {type === 'both' ? 'Email & SMS' : type}
                        </span>
                        <span className="text-sm text-gray-500">{String(count)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', colorClass.replace('bg-', 'bg-').replace('-100', '-500'))}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Δεν υπάρχουν δεδομένα ακόμη
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Ανά Κατάσταση
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.by_status && Object.entries(stats.by_status).length > 0 ? (
              Object.entries(stats.by_status).map(([status, count]) => {
                const statusConfig: Record<string, { color: string; label: string }> = {
                  draft: { color: 'bg-slate-100 text-slate-700', label: 'Πρόχειρο' },
                  scheduled: { color: 'bg-amber-100 text-amber-700', label: 'Προγραμματισμένο' },
                  sending: { color: 'bg-blue-100 text-blue-700', label: 'Αποστολή' },
                  sent: { color: 'bg-green-100 text-green-700', label: 'Στάλθηκε' },
                  failed: { color: 'bg-red-100 text-red-700', label: 'Αποτυχία' },
                };

                const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };

                return (
                  <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <Badge className={config.color}>{config.label}</Badge>
                    <span className="text-lg font-semibold text-gray-900">{String(count)}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Δεν υπάρχουν δεδομένα ακόμη
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recipients Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-100 rounded-full">
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Συνολικοί Παραλήπτες</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_recipients}</p>
              <p className="text-sm text-gray-500 mt-1">
                σε {stats.total_notifications} ειδοποιήσεις
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
