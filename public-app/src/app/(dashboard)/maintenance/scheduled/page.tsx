'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import { Calendar, AlertTriangle, CheckCircle2, Clock, Filter, Plus, Wrench, Loader2, Trash2 } from 'lucide-react';
import { api, extractResults, getActiveBuildingId } from '@/lib/api';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { useRole } from '@/lib/auth';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatCard } from '@/components/ui/stat-card';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface ScheduledMaintenanceRow {
  id: number;
  title: string;
  description?: string;
  contractor?: number | null;
  contractor_name?: string | null;
  scheduled_date?: string | null;
  priority: Priority;
  status: Status;
  estimated_cost?: number | string | null;
  actual_cost?: number | string | null;
  total_cost?: number | string | null;
  location?: string | null;
  updated_at?: string;
  created_at?: string;
}

const STATUS_OPTIONS: Array<{ label: string; value: Status | 'all' }> = [
  { label: 'Όλες', value: 'all' },
  { label: 'Προγραμματισμένες', value: 'scheduled' },
  { label: 'Σε εξέλιξη', value: 'in_progress' },
  { label: 'Ολοκληρωμένες', value: 'completed' },
  { label: 'Ακυρωμένες', value: 'cancelled' },
];

const PRIORITY_OPTIONS: Array<{ label: string; value: Priority | 'all' }> = [
  { label: 'Όλες', value: 'all' },
  { label: 'Χαμηλή', value: 'low' },
  { label: 'Μέτρια', value: 'medium' },
  { label: 'Υψηλή', value: 'high' },
  { label: 'Επείγουσα', value: 'urgent' },
];

const PRIORITY_BADGES: Record<Priority, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  low: { label: 'Χαμηλή', variant: 'secondary' },
  medium: { label: 'Μέτρια', variant: 'outline' },
  high: { label: 'Υψηλή', variant: 'default' },
  urgent: { label: 'Επείγον', variant: 'destructive' },
};

const STATUS_BADGES: Record<Status, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  scheduled: { label: 'Προγραμματισμένο', variant: 'outline' },
  in_progress: { label: 'Σε εξέλιξη', variant: 'default' },
  completed: { label: 'Ολοκληρώθηκε', variant: 'secondary' },
  cancelled: { label: 'Ακυρώθηκε', variant: 'destructive' },
};

const formatCurrency = (value?: string | number | null) => {
  if (value === null || value === undefined) return '—';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) return '—';
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(numeric);
};

export default function ScheduledMaintenancePage() {
  return (
    <AuthGate>
      <SubscriptionGate>
        <ScheduledMaintenanceDashboard />
      </SubscriptionGate>
    </AuthGate>
  );
}

function ScheduledMaintenanceDashboard() {
  useBuildingEvents();
  const buildingId = getActiveBuildingId();
  const { isAdmin, isManager } = useRole();
  const canEdit = isAdmin || isManager;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialPriority = (searchParams.get('priority') as Priority | null) ?? 'all';
  const initialStatus = (searchParams.get('status') as Status | null) ?? 'all';
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>(initialPriority);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>(initialStatus);
  const [taskToDelete, setTaskToDelete] = useState<ScheduledMaintenanceRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const priority = (searchParams.get('priority') as Priority | null) ?? 'all';
    const status = (searchParams.get('status') as Status | null) ?? 'all';
    setPriorityFilter(priority);
    setStatusFilter(status);
  }, [searchParams]);

  const updateUrlFilters = (status: Status | 'all', priority: Priority | 'all') => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    if (priority === 'all') {
      params.delete('priority');
    } else {
      params.set('priority', priority);
    }
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  const scheduledQuery = useQuery({
    queryKey: ['scheduled-maintenance-list', { buildingId, statusFilter, priorityFilter }],
    queryFn: async () => {
      if (!buildingId) return [];
      const params: Record<string, string | number> = {
        building: buildingId,
        ordering: 'scheduled_date',
        limit: 500,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }
      const response = await api.get('/maintenance/scheduled/', params);
      return response;
    },
    enabled: Boolean(buildingId),
    staleTime: 30_000,
  });

  const scheduledRows = extractResults<ScheduledMaintenanceRow>(scheduledQuery.data ?? []);

  const stats = useMemo(() => {
    const now = new Date();
    const toDate = (value?: string | null) => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    return {
      total: scheduledRows.length,
      urgent: scheduledRows.filter((row) => row.priority === 'urgent').length,
      inProgress: scheduledRows.filter((row) => row.status === 'in_progress').length,
      completed: scheduledRows.filter((row) => row.status === 'completed').length,
      upcoming: scheduledRows.filter((row) => {
        const date = toDate(row.scheduled_date);
        return date && date > now;
      }).length,
    };
  }, [scheduledRows]);

  const sortedRows = useMemo(() => {
    const rows = [...scheduledRows];
    return rows.sort((a, b) => {
      const da = a.scheduled_date ? new Date(a.scheduled_date).getTime() : Infinity;
      const db = b.scheduled_date ? new Date(b.scheduled_date).getTime() : Infinity;
      return da - db;
    });
  }, [scheduledRows]);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Status }) =>
      api.patch(`/maintenance/scheduled/${id}/`, { status }),
    onSuccess: async (_, variables) => {
      toast({
        title: 'Ενημέρωση κατάστασης',
        description: `Το έργο ενημερώθηκε σε "${STATUS_BADGES[variables.status].label}".`,
      });
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance-list'] });
      await queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance'] });
      await queryClient.refetchQueries({ queryKey: ['scheduled-maintenance-list'] });
      await queryClient.refetchQueries({ queryKey: ['scheduled-maintenance'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Αποτυχία ενημέρωσης κατάστασης';
      toast({
        title: 'Σφάλμα',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (id: number, nextStatus: Status) => {
    statusMutation.mutate({ id, status: nextStatus });
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/maintenance/scheduled/${taskToDelete.id}/`);
      
      toast({
        title: 'Διαγραφή Επιτυχής',
        description: `Το έργο "${taskToDelete.title}" διαγράφηκε επιτυχώς μαζί με όλα τα σχετικά πεδία.`,
      });
      
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance-list'] });
      await queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance'] });
      await queryClient.refetchQueries({ queryKey: ['scheduled-maintenance-list'] });
      await queryClient.refetchQueries({ queryKey: ['scheduled-maintenance'] });
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Σφάλμα Διαγραφής',
        description: 'Αποτυχία διαγραφής του έργου. Παρακαλώ δοκιμάστε ξανά.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Προγραμματισμένες εργασίες</h1>
          <p className="text-muted-foreground">
            Παρακολούθησε προληπτικές εργασίες συντήρησης, προτεραιότητες και κατάσταση έργων.
          </p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/maintenance/scheduled/new">
              <Plus className="mr-2 h-4 w-4" />
              Νέα εργασία
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Σύνολο εργασιών" value={stats.total} icon={<Wrench className="h-5 w-5 text-blue-600" />} />
        <StatCard title="Επείγουσες" value={stats.urgent} icon={<AlertTriangle className="h-5 w-5 text-red-600" />} />
        <StatCard title="Σε εξέλιξη" value={stats.inProgress} icon={<Clock className="h-5 w-5 text-amber-600" />} />
        <StatCard title="Ολοκληρώθηκαν" value={stats.completed} icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Φίλτρα</CardTitle>
            <CardDescription>Προσαρμόστε την λίστα βάσει κατάστασης ή προτεραιότητας.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <FilterGroup
              icon={<Filter className="h-4 w-4" />}
              label="Κατάσταση"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                updateUrlFilters(value, priorityFilter);
              }}
            />
            <FilterGroup
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Προτεραιότητα"
              options={PRIORITY_OPTIONS}
              value={priorityFilter}
              onChange={(value) => {
                setPriorityFilter(value);
                updateUrlFilters(statusFilter, value);
              }}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Προγραμματισμένες εργασίες</CardTitle>
              <CardDescription>
                {scheduledQuery.isLoading
                  ? 'Φόρτωση δεδομένων...'
                  : `Εμφανίζονται ${sortedRows.length} εργασίες για το επιλεγμένο κτίριο.`}
              </CardDescription>
            </div>
            {scheduledQuery.isFetching && (
              <Badge variant="outline" className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Ενημέρωση
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {scheduledQuery.isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Φόρτωση εργασιών...
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Δεν βρέθηκαν εργασίες με τα επιλεγμένα φίλτρα.
              {canEdit && (
                <>
                  {' '}
                  <Link href="/maintenance/scheduled/new" className="text-primary underline">
                    Δημιούργησε την πρώτη τώρα.
                  </Link>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Τίτλος</TableHead>
                  <TableHead>Ημερομηνία</TableHead>
                  <TableHead>Συνεργείο</TableHead>
                  <TableHead>Προτεραιότητα</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                  <TableHead className="text-right">Κόστος</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[280px]">
                      <div className="font-medium">{row.title}</div>
                      {row.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{row.description}</p>
                      )}
                      {row.scheduled_date && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(row.scheduled_date), { addSuffix: true, locale: el })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.scheduled_date ? format(new Date(row.scheduled_date), "d MMM yyyy", { locale: el }) : '—'}
                    </TableCell>
                    <TableCell>{row.contractor_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_BADGES[row.priority].variant}>{PRIORITY_BADGES[row.priority].label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGES[row.status].variant}>{STATUS_BADGES[row.status].label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.total_cost ?? row.actual_cost ?? row.estimated_cost)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/maintenance/scheduled/${row.id}`}>Λεπτομέρειες</Link>
                        </Button>
                        {canEdit && row.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={statusMutation.isPending}
                            onClick={() => handleStatusChange(row.id, row.status === 'scheduled' ? 'in_progress' : 'completed')}
                          >
                            {statusMutation.isPending ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            {row.status === 'scheduled' ? 'Έναρξη' : 'Ολοκλήρωση'}
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTaskToDelete(row)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            title="Διαγραφή έργου"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Διαγραφή Προγραμματισμένου Έργου"
        description={
          taskToDelete
            ? `Είστε σίγουροι ότι θέλετε να διαγράψετε το έργο "${taskToDelete.title}"${taskToDelete.contractor_name ? ` από το συνεργείο "${taskToDelete.contractor_name}"` : ''}? ΠΡΟΣΟΧΗ: Αυτή η ενέργεια θα διαγράψει και όλα τα σχετικά πεδία (δαπάνες, αποδείξεις, προσφορές). Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
            : 'Είστε σίγουροι;'
        }
        confirmText="Διαγραφή Έργου"
        cancelText="Ακύρωση"
        confirmVariant="destructive"
        isConfirmLoading={isDeleting}
        onConfirm={handleDeleteTask}
      />
    </div>
  );
}

function FilterGroup<T extends string>({
  icon,
  label,
  options,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 uppercase">
        {icon}
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={value === option.value ? 'default' : 'outline'}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
