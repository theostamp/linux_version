'use client';

import { useState } from 'react';
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
import { notificationsApi } from '@/lib/api/notifications';
import type { Notification } from '@/types/notifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const { 
    data: notifications = [], 
    isLoading, 
    refetch,
    isFetching 
  } = useQuery<Notification[]>({
    queryKey: ['notifications-history', buildingFilter, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (buildingFilter !== 'all') {
        params.building = parseInt(buildingFilter);
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      return notificationsApi.list(params);
    },
    staleTime: 60 * 1000,
  });

  // Statistics
  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'sent').length,
    failed: notifications.filter(n => n.status === 'failed').length,
    totalRecipients: notifications.reduce((sum, n) => sum + (n.total_recipients || 0), 0),
  };

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
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Ανανέωση
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                <p className="text-xs text-gray-500">Επιτυχείς</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.totalRecipients}</p>
                <p className="text-xs text-gray-500">Παραλήπτες</p>
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
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Φόρτωση...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Mail className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>Δεν υπάρχουν αποστολές ακόμα</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const typeInfo = getMessageTypeIcon(notification.subject);
                const StatusIcon = statusConfig[notification.status]?.icon || Clock;
                const TypeIcon = typeInfo.icon;
                
                return (
                  <div
                    key={notification.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedNotification(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-full bg-gray-100", typeInfo.color)}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {notification.subject}
                          </h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDateShort(notification.created_at)}
                          </span>
                        </div>
                        
                        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                          <Badge className={cn("text-xs", statusConfig[notification.status]?.color)}>
                            {statusConfig[notification.status]?.label}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {notification.successful_sends}/{notification.total_recipients}
                          </span>
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
        open={!!selectedNotification} 
        onOpenChange={() => setSelectedNotification(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Λεπτομέρειες Αποστολής</DialogTitle>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500 mb-1">Θέμα:</p>
                <p className="font-medium">{selectedNotification.subject}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Κατάσταση</p>
                  <Badge className={cn("mt-1", statusConfig[selectedNotification.status]?.color)}>
                    {statusConfig[selectedNotification.status]?.label}
                  </Badge>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Ημερομηνία</p>
                  <p className="font-medium text-sm mt-1">
                    {formatDate(selectedNotification.created_at)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {selectedNotification.successful_sends}
                  </p>
                  <p className="text-xs text-green-700">Επιτυχείς</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {selectedNotification.failed_sends}
                  </p>
                  <p className="text-xs text-red-700">Αποτυχίες</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedNotification.total_recipients}
                  </p>
                  <p className="text-xs text-blue-700">Σύνολο</p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500 mb-2">Περιεχόμενο:</p>
                <div className="whitespace-pre-wrap text-sm bg-white p-3 rounded border max-h-64 overflow-y-auto">
                  {selectedNotification.body}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

