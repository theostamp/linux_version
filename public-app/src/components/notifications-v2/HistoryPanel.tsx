'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  FileSpreadsheet,
  Wallet,
  Megaphone,
  Users,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Eye
} from 'lucide-react';
import { notificationsApi, emailBatchesApi } from '@/lib/api/notifications';
import type {
  Notification,
  NotificationStatistics,
  EmailBatch,
  EmailBatchStatistics,
} from '@/types/notifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const statusConfig = {
  draft: { label: 'Πρόχειρο', color: 'bg-gray-100 text-gray-700', icon: Clock },
  scheduled: { label: 'Προγραμματισμένο', color: 'bg-amber-100 text-amber-700', icon: Clock },
  sending: { label: 'Αποστέλλεται', color: 'bg-blue-100 text-blue-700', icon: Send },
  partial: { label: 'Μερικώς', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  sent: { label: 'Απεστάλη', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Αποτυχία', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const getMessageTypeIcon = (subject: string) => {
  const lower = subject.toLowerCase();
  if (lower.includes('κοινόχρηστα') || lower.includes('κοινοχρήστων')) {
    return { icon: FileSpreadsheet, color: 'text-blue-600' };
  }
  if (lower.includes('οφειλή') || lower.includes('υπενθύμιση')) {
    return { icon: Wallet, color: 'text-amber-600' };
  }
  if (lower.includes('συνέλευση') || lower.includes('πρόσκληση')) {
    return { icon: Users, color: 'text-purple-600' };
  }
  if (lower.includes('συντήρηση') || lower.includes('εργασί')) {
    return { icon: Wrench, color: 'text-teal-600' };
  }
  if (lower.includes('επείγ') || lower.includes('έκτακτ')) {
    return { icon: AlertTriangle, color: 'text-red-600' };
  }
  return { icon: Megaphone, color: 'text-indigo-600' };
};

type HistoryItem =
  | { kind: 'notification'; data: Notification }
  | { kind: 'batch'; data: EmailBatch };

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('el-GR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Χθες';
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('el-GR', { weekday: 'short' });
  }
  return date.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
};

export default function HistoryPanel() {
  const { buildings, selectedBuilding } = useBuilding();
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const formatDateParam = (date: Date) => date.toISOString().slice(0, 10);

  const dateParams = useMemo(() => {
    if (dateRange === 'all') {
      return { startDate: '', endDate: '' };
    }

    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);

    switch (dateRange) {
      case 'today':
        break;
      case 'last7':
        start.setDate(start.getDate() - 6);
        break;
      case 'last30':
        start.setDate(start.getDate() - 29);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth': {
        const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
        start.setFullYear(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
        end.setFullYear(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), lastOfLastMonth.getDate());
        break;
      }
      case 'custom':
        return { startDate: customStartDate, endDate: customEndDate };
      default:
        break;
    }

    return {
      startDate: formatDateParam(start),
      endDate: formatDateParam(end),
    };
  }, [dateRange, customStartDate, customEndDate]);

  const {
    data: notifications = [],
    isLoading,
    refetch,
    isFetching
  } = useQuery<Notification[]>({
    queryKey: ['notifications-history', buildingFilter, statusFilter, dateParams.startDate, dateParams.endDate],
    queryFn: async () => {
      const params: any = {};
      if (buildingFilter !== 'all') {
        params.building = parseInt(buildingFilter);
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateParams.startDate) {
        params.start_date = dateParams.startDate;
      }
      if (dateParams.endDate) {
        params.end_date = dateParams.endDate;
      }
      return notificationsApi.list(params);
    },
    staleTime: 60 * 1000,
  });

  const { data: statsData, isLoading: isStatsLoading, isFetching: isStatsFetching, refetch: refetchStats } = useQuery<NotificationStatistics>({
    queryKey: ['notifications-stats', buildingFilter, statusFilter, dateParams.startDate, dateParams.endDate],
    queryFn: async () => {
      const params: any = {};
      if (buildingFilter !== 'all') {
        params.building = parseInt(buildingFilter);
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateParams.startDate) {
        params.start_date = dateParams.startDate;
      }
      if (dateParams.endDate) {
        params.end_date = dateParams.endDate;
      }
      return notificationsApi.stats(params);
    },
    staleTime: 60 * 1000,
  });

  const {
    data: emailBatches = [],
    isLoading: isBatchesLoading,
    isFetching: isBatchesFetching,
    refetch: refetchBatches,
  } = useQuery<EmailBatch[]>({
    queryKey: ['email-batches-history', buildingFilter, dateParams.startDate, dateParams.endDate],
    queryFn: async () => {
      const params: any = { purpose: 'common_expense' };
      if (buildingFilter !== 'all') {
        params.building = parseInt(buildingFilter);
      }
      if (dateParams.startDate) {
        params.start_date = dateParams.startDate;
      }
      if (dateParams.endDate) {
        params.end_date = dateParams.endDate;
      }
      return emailBatchesApi.list(params);
    },
    staleTime: 60 * 1000,
  });

  const {
    data: batchStatsData,
    isLoading: isBatchStatsLoading,
    isFetching: isBatchStatsFetching,
    refetch: refetchBatchStats,
  } = useQuery<EmailBatchStatistics>({
    queryKey: ['email-batches-stats', buildingFilter, dateParams.startDate, dateParams.endDate],
    queryFn: async () => {
      const params: any = { purpose: 'common_expense' };
      if (buildingFilter !== 'all') {
        params.building = parseInt(buildingFilter);
      }
      if (dateParams.startDate) {
        params.start_date = dateParams.startDate;
      }
      if (dateParams.endDate) {
        params.end_date = dateParams.endDate;
      }
      return emailBatchesApi.stats(params);
    },
    staleTime: 60 * 1000,
  });

  const stats = statsData || {
    total_notifications: 0,
    total_sent: 0,
    total_failed: 0,
    total_recipients: 0,
    total_successful_sends: 0,
    total_failed_sends: 0,
    delivery_rate: 0,
    average_delivery_rate: 0,
    by_type: {},
    by_status: {},
    recent_notifications: [],
  };

  const batchStats = batchStatsData || {
    total_batches: 0,
    total_sent: 0,
    total_failed: 0,
    total_partial: 0,
    total_recipients: 0,
    total_successful_sends: 0,
    total_failed_sends: 0,
    delivery_rate: 0,
    average_delivery_rate: 0,
    by_status: {},
  };

  const combinedStats = useMemo(() => {
    const total_recipients = stats.total_recipients + batchStats.total_recipients;
    const total_successful_sends = stats.total_successful_sends + batchStats.total_successful_sends;
    const total_failed_sends = stats.total_failed_sends + batchStats.total_failed_sends;
    const delivery_rate = total_recipients
      ? (total_successful_sends / total_recipients) * 100
      : 0;

    return {
      total_notifications: stats.total_notifications + batchStats.total_batches,
      total_sent: stats.total_sent + batchStats.total_sent,
      total_failed: stats.total_failed + batchStats.total_failed,
      total_recipients,
      total_successful_sends,
      total_failed_sends,
      delivery_rate,
    };
  }, [stats, batchStats]);

  const filteredBatches = useMemo(() => {
    if (statusFilter === 'all') return emailBatches;
    if (statusFilter === 'sent') {
      return emailBatches.filter((batch) => batch.status === 'sent');
    }
    if (statusFilter === 'failed') {
      return emailBatches.filter((batch) => batch.status !== 'sent');
    }
    return emailBatches;
  }, [emailBatches, statusFilter]);

  const historyItems = useMemo(() => {
    const items: HistoryItem[] = [
      ...notifications.map((notification) => ({ kind: 'notification', data: notification })),
      ...filteredBatches.map((batch) => ({ kind: 'batch', data: batch })),
    ];

    return items.sort((a, b) => {
      const dateA = new Date(a.data.created_at).getTime();
      const dateB = new Date(b.data.created_at).getTime();
      return dateB - dateA;
    });
  }, [notifications, filteredBatches]);

  const isStatsBusy = isStatsLoading || isBatchStatsLoading;
  const isListLoading = isLoading || isBatchesLoading;
  const isAnyFetching = isFetching || isStatsFetching || isBatchesFetching || isBatchStatsFetching;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ιστορικό Αποστολών</h2>
          <p className="text-sm text-gray-500">
            Όλα τα μηνύματα που έχουν αποσταλεί
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetch();
            refetchStats();
            refetchBatches();
            refetchBatchStats();
          }}
          disabled={isAnyFetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isAnyFetching && "animate-spin")} />
          Ανανέωση
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsBusy ? '—' : combinedStats.total_notifications}
                </p>
                <p className="text-xs text-gray-500">Συνολικά</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsBusy ? '—' : combinedStats.total_sent}
                </p>
                <p className="text-xs text-gray-500">Απεστάλησαν</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsBusy ? '—' : combinedStats.total_failed}
                </p>
                <p className="text-xs text-gray-500">Αποτυχίες</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsBusy ? '—' : combinedStats.total_recipients}
                </p>
                <p className="text-xs text-gray-500">Σύνολο παραληπτών</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsBusy ? '—' : combinedStats.total_successful_sends}
                </p>
                <p className="text-xs text-gray-500">
                  Επιτυχείς παραλήπτες {combinedStats.total_recipients ? `(${combinedStats.delivery_rate.toFixed(1)}%)` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-rose-100">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsBusy ? '—' : combinedStats.total_failed_sends}
                </p>
                <p className="text-xs text-gray-500">Αποτυχημένοι παραλήπτες</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={buildingFilter} onValueChange={setBuildingFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Πολυκατοικία" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες οι πολυκατοικίες</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id.toString()}>
                {b.name || b.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Κατάσταση" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες οι καταστάσεις</SelectItem>
            <SelectItem value="sent">Απεστάλη</SelectItem>
            <SelectItem value="sending">Αποστέλλεται</SelectItem>
            <SelectItem value="scheduled">Προγραμματισμένο</SelectItem>
            <SelectItem value="failed">Αποτυχία</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(value) => setDateRange(value as typeof dateRange)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Ημερομηνία" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες οι ημερομηνίες</SelectItem>
            <SelectItem value="today">Σήμερα</SelectItem>
            <SelectItem value="last7">Τελευταίες 7 ημέρες</SelectItem>
            <SelectItem value="last30">Τελευταίες 30 ημέρες</SelectItem>
            <SelectItem value="thisMonth">Τρέχων μήνας</SelectItem>
            <SelectItem value="lastMonth">Προηγούμενος μήνας</SelectItem>
            <SelectItem value="custom">Προσαρμοσμένο</SelectItem>
          </SelectContent>
        </Select>

        {dateRange === 'custom' && (
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={customStartDate}
              onChange={(event) => setCustomStartDate(event.target.value)}
              className="w-[170px]"
            />
            <Input
              type="date"
              value={customEndDate}
              onChange={(event) => setCustomEndDate(event.target.value)}
              className="w-[170px]"
            />
          </div>
        )}
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {isListLoading ? (
            <div className="p-8 text-center text-gray-500">Φόρτωση...</div>
          ) : historyItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Mail className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>Δεν υπάρχουν αποστολές ακόμα</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {historyItems.map((item) => {
                const subject = item.data.subject || '';
                const typeInfo = getMessageTypeIcon(subject);
                const StatusIcon = statusConfig[item.data.status]?.icon || Clock;
                const TypeIcon = typeInfo.icon;
                const successful = item.data.successful_sends || 0;
                const total = item.data.total_recipients || 0;
                const buildingLabel = item.kind === 'batch' ? item.data.building_name : null;

                return (
                  <div
                    key={`${item.kind}-${item.data.id}`}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-full bg-gray-100", typeInfo.color)}>
                        <TypeIcon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {subject}
                          </h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDateShort(item.data.created_at)}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                          <Badge className={cn("text-xs", statusConfig[item.data.status]?.color)}>
                            {statusConfig[item.data.status]?.label}
                          </Badge>
                          {item.kind === 'batch' && (
                            <Badge className="text-xs bg-blue-50 text-blue-700">
                              Κοινόχρηστα
                            </Badge>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {successful}/{total}
                          </span>
                          {buildingLabel && (
                            <span className="text-xs text-gray-400 truncate">
                              {buildingLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={() => setSelectedItem(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Λεπτομέρειες Αποστολής</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500 mb-1">Θέμα:</p>
                <p className="font-medium">{selectedItem.data.subject}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Κατάσταση</p>
                  <Badge className={cn("mt-1", statusConfig[selectedItem.data.status]?.color)}>
                    {statusConfig[selectedItem.data.status]?.label}
                  </Badge>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Ημερομηνία</p>
                  <p className="font-medium text-sm mt-1">
                    {formatDate(selectedItem.data.created_at)}
                  </p>
                </div>
              </div>

              {selectedItem.kind === 'batch' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Πολυκατοικία</p>
                    <p className="font-medium text-sm mt-1">
                      {selectedItem.data.building_name || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Μήνας</p>
                    <p className="font-medium text-sm mt-1">
                      {(selectedItem.data.metadata as { month?: string })?.month || '—'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {selectedItem.data.successful_sends}
                  </p>
                  <p className="text-xs text-green-700">Επιτυχείς</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {selectedItem.data.failed_sends}
                  </p>
                  <p className="text-xs text-red-700">Αποτυχίες</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedItem.data.total_recipients}
                  </p>
                  <p className="text-xs text-blue-700">Σύνολο</p>
                </div>
              </div>

              {selectedItem.kind === 'notification' && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500 mb-2">Περιεχόμενο:</p>
                  <div className="whitespace-pre-wrap text-sm bg-white p-3 rounded border max-h-64 overflow-y-auto">
                    {selectedItem.data.body}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
