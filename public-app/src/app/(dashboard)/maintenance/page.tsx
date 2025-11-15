'use client';

/**
 * Maintenance Dashboard - Services & Expenses
 * 
 * This page separates services/maintenance expenses from operational expenses:
 * 
 * - "Όλες οι Δαπάνες" tab (default): Shows all operational expenses (utilities, monthly bills)
 *   (electricity_common, water_common, heating_fuel, heating_gas, garbage_collection)
 * 
 * - "Επισκόπηση & Έργα" tab: Shows contractors, maintenance projects, and service-related expenses
 *   (excludes operational expenses like utilities, monthly bills)
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, extractCount, extractResults, getActiveBuildingId } from '@/lib/api';
import { fetchPublicMaintenanceCounters } from '@/lib/apiPublic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Calendar, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { getRelativeTimeEl } from '@/lib/date';
import { useRole } from '@/lib/auth';
import { BackButton } from '@/components/ui/BackButton';
import { ExpenseForm } from '@/components/financial/ExpenseForm';
import { useExpenses } from '@/hooks/useExpenses';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

interface MaintenanceStats {
  total_contractors: number;
  active_contractors: number;
  pending_receipts: number;
  scheduled_maintenance: number;
  urgent_maintenance: number;
  completed_maintenance: number;
  total_spent: number;
}

// Operational Expenses Tab Component
function OperationalExpensesTab({ buildingId }: { buildingId: number | null }) {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);
  const { toast } = useToast();
  const { deleteExpense } = useExpenses(buildingId || 0);
  
  // Query for operational expenses (utilities and regular monthly bills ONLY)
  const operationalExpensesQ = useQuery({
    queryKey: ['operational-expenses', { building: buildingId }],
    queryFn: async () => {
      const response = await api.get('/financial/expenses/', {
        params: {
          building_id: buildingId,
          category__in: [
            'electricity_common',
            'water_common', 
            'heating_fuel',
            'heating_gas',
            'garbage_collection'
          ].join(','),
          ordering: '-date',
          limit: 50
        }
      });
      return response.data;
    },
    enabled: !!buildingId
  });

  type OperationalExpense = {
    id: number;
    title?: string;
    date: string;
    amount: number | string;
    category?: string;
  };
  const expenseRows = extractResults<OperationalExpense>(operationalExpensesQ.data ?? []);
  const totalOperationalExpenses = expenseRows.reduce((sum: number, expense: OperationalExpense) => sum + (Number(expense?.amount) || 0), 0);

  // Handle expense deletion
  const handleDeleteExpense = async (expenseId: number, expenseTitle: string) => {
    try {
      setDeletingExpenseId(expenseId);
      const success = await deleteExpense(expenseId);
      
      if (success) {
        toast({
          title: 'Διαγραφή Επιτυχής',
          description: `Η δαπάνη "${expenseTitle}" διαγράφηκε επιτυχώς.`
        });
        // Refresh the query
        operationalExpensesQ.refetch();
      } else {
        toast({
          title: 'Σφάλμα Διαγραφής',
          description: 'Αποτυχία διαγραφής της δαπάνης. Παρακαλώ δοκιμάστε ξανά.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Σφάλμα Διαγραφής',
        description: 'Αποτυχία διαγραφής της δαπάνης. Παρακαλώ δοκιμάστε ξανά.',
        variant: 'destructive'
      });
    } finally {
      setDeletingExpenseId(null);
    }
  };

  if (showExpenseForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-800">Νέος Μηνιαίος Λογαριασμός</h2>
          <Button 
            variant="outline" 
            onClick={() => setShowExpenseForm(false)}
          >
            Ακύρωση
          </Button>
        </div>
        <ExpenseForm
          buildingId={buildingId || 1}
          onSuccess={() => {
            setShowExpenseForm(false);
            operationalExpensesQ.refetch();
          }}
          onCancel={() => setShowExpenseForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-800">Λειτουργικές Δαπάνες</h2>
          <p className="text-muted-foreground">
            Διαχείριση μηνιαίων λογαριασμών κτιρίου (ρεύμα, νερό, θέρμανση, απορρίμματα)
          </p>
        </div>
        <Button onClick={() => setShowExpenseForm(true)}>
          <FileText className="w-4 h-4 mr-2" />
          Νέος Λογαριασμός
        </Button>
      </div>

      {/* Stats for Operational Expenses */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικές Δαπάνες</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{Math.round(totalOperationalExpenses).toLocaleString('el-GR')}</div>
            <p className="text-xs text-muted-foreground">Φέτος</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Αριθμός Δαπανών</CardTitle>
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <FileText className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenseRows.length}</div>
            <p className="text-xs text-muted-foreground">Καταχωρήσεις</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Μέσος Όρος/Μήνα</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{expenseRows.length > 0 ? Math.round(totalOperationalExpenses / Math.max(expenseRows.length, 1)).toLocaleString('el-GR') : 0}
            </div>
            <p className="text-xs text-muted-foreground">Ανά καταχώρηση</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Τελευταία Ενημέρωση</CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenseRows.length > 0 ? getRelativeTimeEl(new Date(expenseRows[0]?.date || new Date())) : 'Καμία'}
            </div>
            <p className="text-xs text-muted-foreground">Δαπάνη</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Operational Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Πρόσφατες Λειτουργικές Δαπάνες</CardTitle>
          <CardDescription>
            Τελευταίες καταχωρήσεις μηνιαίων λογαριασμών κτιρίου (ρεύμα, νερό, θέρμανση, απορρίμματα)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {operationalExpensesQ.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : expenseRows.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">Δεν υπάρχουν μηνιαίοι λογαριασμοί.</p>
              <Button onClick={() => setShowExpenseForm(true)}>
                Προσθήκη πρώτου λογαριασμού
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {expenseRows.slice(0, 5).map((expense: OperationalExpense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{expense.title || 'Λειτουργική Δαπάνη'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString('el-GR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">€{Number(expense.amount).toLocaleString('el-GR')}</p>
                      <Badge variant="outline" className="text-xs">
                        {expense.category === 'electricity_common' ? 'ΔΕΗ' :
                         expense.category === 'water_common' ? 'ΕΥΔΑΠ' :
                         expense.category === 'heating_fuel' ? 'Πετρέλαιο' :
                         expense.category === 'heating_gas' ? 'Αέριο' :
                         expense.category === 'garbage_collection' ? 'Απορρίμματα' :
                         'Λειτουργικά'}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteExpense(expense.id, expense.title || 'Λειτουργική Δαπάνη')}
                      disabled={deletingExpenseId === expense.id}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      title="Διαγραφή δαπάνης"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {expenseRows.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" asChild>
                    <Link href="/financial">Δείτε όλες τις δαπάνες</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions for Operational Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Γρήγορες Ενέργειες</CardTitle>
          <CardDescription>
            Συχνές λειτουργίες για μηνιαίους λογαριασμούς κτιρίου
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex-col"
              onClick={() => setShowExpenseForm(true)}
            >
              <FileText className="w-6 h-6 mb-2" />
              <span>Νέος Λογαριασμός</span>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/financial">
                <TrendingUp className="w-6 h-6 mb-2" />
                <span>Όλες οι Δαπάνες</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/financial/common-expenses">
                <Calendar className="w-6 h-6 mb-2" />
                <span>Κοινόχρηστα</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/financial/reports">
                <CheckCircle className="w-6 h-6 mb-2" />
                <span>Αναφορές</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MaintenanceDashboardContent() {
  useBuildingEvents();
  const { isAdmin, isManager } = useRole();
  const buildingId = getActiveBuildingId();
  const [activeTab, setActiveTab] = useState('operational-expenses');

  const contractorsQ = useQuery({
    queryKey: ['contractors', { building: buildingId }],
    queryFn: async () => (await api.get(`/maintenance/contractors/`)).data,
  });
  const receiptsQ = useQuery({
    queryKey: ['receipts', { building: buildingId, payment_status: 'pending' }],
    queryFn: async () => (await api.get(`/maintenance/receipts/`, { params: { building: buildingId, payment_status: 'pending' } })).data,
  });
  const receiptsCompletedQ = useQuery({
    queryKey: ['receipts', { building: buildingId, payment_status: 'paid' }],
    queryFn: async () => (await api.get(`/maintenance/receipts/`, { params: { building: buildingId, payment_status: 'paid' } })).data,
  });
  // Year boundaries
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  // Service/Maintenance expenses for the year (excludes operational expenses and future management fees)
  const serviceExpensesYearQ = useQuery({
    queryKey: ['service-expenses-year', { building: buildingId, year }],
    queryFn: async () => {
      const response = await api.get(`/financial/expenses/`, { 
        params: { 
          building_id: buildingId, 
          date__gte: yearStart, 
          date__lte: yearEnd, 
          limit: 1000,
          // Exclude operational expenses (utilities, monthly bills)
          category__not_in: [
            'electricity_common',
            'water_common', 
            'heating_fuel',
            'heating_gas',
            'garbage_collection'
          ].join(',')
        } 
      });
      
      // Filter out future management fees on the client side
      type ServiceExpense = {
        id: number;
        amount: number | string;
        date?: string;
        category?: string;
      };
      const expenses = extractResults<ServiceExpense>(response.data ?? []);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-based month
      const currentYear = currentDate.getFullYear();
      
      const filteredExpenses = expenses.filter((expense: ServiceExpense) => {
        // If it's a management fee, check if it's for a future month
        if (expense.category === 'management_fees') {
          const expenseDate = new Date(expense.date);
          const expenseMonth = expenseDate.getMonth() + 1; // 1-based month
          const expenseYear = expenseDate.getFullYear();
          
          // Exclude management fees for current and future months (only include past months)
          if (expenseYear > currentYear || (expenseYear === currentYear && expenseMonth >= currentMonth)) {
            return false;
          }
        }
        return true;
      });
      
      return {
        ...response.data,
        results: filteredExpenses
      };
    },
    staleTime: 30_000,
  });

  // Total expenses for the year from Financial Expenses API (for operational expenses tab)
  const expensesYearQ = useQuery({
    queryKey: ['expenses-year', { building: buildingId, year }],
    queryFn: async () => (await api.get(`/financial/expenses/`, { params: { building_id: buildingId, date__gte: yearStart, date__lte: yearEnd, limit: 1000 } })).data,
    staleTime: 30_000,
  });
  // Completed scheduled works for the year (filter by scheduled_date range)
  const completedYearQ = useQuery({
    queryKey: ['scheduled-completed-year', { building: buildingId, year }],
    queryFn: async () => (await api.get(`/maintenance/scheduled/`, { params: { building: buildingId, status: 'completed', scheduled_date__gte: yearStart, scheduled_date__lte: yearEnd, limit: 1 } })).data,
    staleTime: 30_000,
  });
  // Service receipts for the year (proxy for completed works when no scheduled items marked completed)
  const receiptsYearQ = useQuery({
    queryKey: ['maintenance-receipts-year', { building: buildingId, year }],
    queryFn: async () => (await api.get(`/maintenance/receipts/`, { params: { building: buildingId, service_date__gte: yearStart, service_date__lte: yearEnd, limit: 1000 } })).data,
    staleTime: 30_000,
  });
  const scheduledQ = useQuery({
    queryKey: ['scheduled-maintenance', { building: buildingId }],
    queryFn: async () => (await api.get(`/maintenance/scheduled/`, { params: { building: buildingId } })).data,
  });
  const urgentScheduledQ = useQuery({
    queryKey: ['scheduled-maintenance', { building: buildingId, priority: 'urgent' }],
    queryFn: async () => (await api.get(`/maintenance/scheduled/`, { params: { building: buildingId, priority: 'urgent' } })).data,
  });

  // Query for approved projects (from offers that were accepted)
  const approvedProjectsQ = useQuery({
    queryKey: ['approved-projects', { building: buildingId }],
    queryFn: async () => {
      const response = await api.get('/projects/projects/', {
        params: {
          building: buildingId,
          status__in: 'approved,in_progress',
          page_size: 100
        }
      });
      return response.data;
    },
    enabled: !!buildingId
  });

  // Public counters fallback when private endpoints return 401/are unavailable
  const publicCountersQ = useQuery({
    queryKey: ['maintenance-public-counters', { building: buildingId }],
    queryFn: () => fetchPublicMaintenanceCounters(buildingId ?? 1),
    enabled: Boolean(contractorsQ.isError || receiptsQ.isError || scheduledQ.isError || urgentScheduledQ.isError),
    staleTime: 30_000,
  });

  type ContractorRow = {
    id: number;
    name?: string;
    service_type?: string;
  };
  type ScheduledMaintenanceRow = {
    id: number;
    title?: string;
    scheduled_date?: string;
  };
  type ExpenseRow = {
    id: number;
    amount: number | string;
  };
  
  const loading = contractorsQ.isLoading || receiptsQ.isLoading || receiptsCompletedQ.isLoading || scheduledQ.isLoading || urgentScheduledQ.isLoading || serviceExpensesYearQ.isLoading || expensesYearQ.isLoading || completedYearQ.isLoading || receiptsYearQ.isLoading;
  const contractorRows = extractResults<ContractorRow>(contractorsQ.data ?? []);
  const scheduledRows = extractResults<ScheduledMaintenanceRow>(scheduledQ.data ?? []);
  // Service/Maintenance expenses total for the year (for overview tab)
  const totalServiceSpentThisYear = useMemo(() => {
    const rows = extractResults<ExpenseRow>(serviceExpensesYearQ.data ?? []);
    return rows.reduce((sum: number, r: ExpenseRow) => sum + (Number(r?.amount) || 0), 0);
  }, [serviceExpensesYearQ.data]);

  // Total expenses for the year (for operational expenses tab)
  // Note: Currently unused but kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _totalSpentThisYear = useMemo(() => {
    const rows = extractResults<ExpenseRow>(expensesYearQ.data ?? []);
    return rows.reduce((sum: number, r: ExpenseRow) => sum + (Number(r?.amount) || 0), 0);
  }, [expensesYearQ.data]);
  const completedThisYear = useMemo(() => {
    // Prefer server-side count if provided
    const data = completedYearQ.data;
    type CountResponse = { count?: number };
    const count = (data && typeof data === 'object' && typeof (data as CountResponse).count === 'number') ? (data as CountResponse).count : extractResults<{ id: number }>(data ?? []).length;
    if (count > 0) return count;
    // Fallback 1: maintenance service receipts count in the year
    type ReceiptRow = { id: number };
    const receiptsRows = extractResults<ReceiptRow>(receiptsYearQ.data ?? []);
    if (Array.isArray(receiptsRows) && receiptsRows.length > 0) {
      return receiptsRows.length;
    }
    // Fallback: local filtering (if server didn't return count)
    const startMs = new Date(`${year}-01-01T00:00:00`).getTime();
    const endMs = new Date(`${year}-12-31T23:59:59.999`).getTime();
    const toMs = (v: string | null | undefined): number | null => {
      if (!v || typeof v !== 'string') return null;
      const s = v.length === 10 ? `${v}T00:00:00` : v;
      const t = new Date(s).getTime();
      return Number.isFinite(t) ? t : null;
    };
    type ScheduledRowWithDates = ScheduledMaintenanceRow & {
      finished_at?: string;
      completed_at?: string;
      updated_at?: string;
      scheduled_date?: string;
      created_at?: string;
      status?: string;
    };
    const getCompletionDateMs = (r: ScheduledRowWithDates): number | null => (
      toMs(r?.finished_at) ?? toMs(r?.completed_at) ?? toMs(r?.updated_at) ?? toMs(r?.scheduled_date) ?? toMs(r?.created_at) ?? null
    );
    return scheduledRows.filter((r: ScheduledRowWithDates) => r?.status === 'completed' && (() => {
      const ms = getCompletionDateMs(r);
      return ms !== null && ms >= startMs && ms <= endMs;
    })()).length;
  }, [completedYearQ.data, receiptsYearQ.data, scheduledRows, year]);

  // using shared helper getRelativeTimeEl

  // Build activity items from real data
  type ActivityItem = {
    key: string;
    icon: React.ReactNode;
    bgClass: string;
    text: string;
    date: Date;
    badge: { label: string; variant: 'secondary' | 'outline' };
  };

  const toDate = (value: unknown): Date | null => {
    if (!value || typeof value !== 'string') return null;
    const s = value.length === 10 ? `${value}T00:00:00` : value;
    const t = new Date(s);
    return isNaN(t.getTime()) ? null : t;
  };

  type ReceiptWithDates = {
    finished_at?: string;
    completed_at?: string;
    updated_at?: string;
    service_date?: string;
    created_at?: string;
    scheduled_date?: string;
    status?: string;
  };
  type ReceiptPendingRow = ReceiptWithDates & { id: number };
  const receiptsPendingRows = extractResults<ReceiptPendingRow>(receiptsQ.data ?? []);
  const getCompletionDate = (r: ReceiptWithDates): Date | null => {
    return (
      toDate(r?.finished_at) ||
      toDate(r?.completed_at) ||
      toDate(r?.updated_at) ||
      toDate(r?.scheduled_date) ||
      toDate(r?.created_at) ||
      null
    );
  };

  const byLatest = <T extends ReceiptWithDates>(getDate: (r: T) => Date | null) => (a: T, b: T) => {
    const da = getDate(a)?.getTime() ?? -Infinity;
    const db = getDate(b)?.getTime() ?? -Infinity;
    return db - da;
  };

  const latestCompletedScheduled = [...scheduledRows]
    .filter((r: ScheduledRowWithDates) => r?.status === 'completed')
    .sort(byLatest(getCompletionDate))[0];

  const latestPendingReceipt = [...receiptsPendingRows]
    .sort(byLatest((r: ReceiptPendingRow) => toDate(r?.updated_at) || toDate(r?.service_date) || toDate(r?.created_at)))[0];

  type ContractorWithDates = ContractorRow & {
    created_at?: string;
    updated_at?: string;
  };
  const latestContractor = [...contractorRows]
    .sort(byLatest((r: ContractorWithDates) => toDate(r?.created_at) || toDate(r?.updated_at)))[0];

  const activityItems: ActivityItem[] = [];

  if (latestCompletedScheduled) {
    const d = getCompletionDate(latestCompletedScheduled) ?? new Date();
    activityItems.push({
      key: `scheduled-${latestCompletedScheduled.id}`,
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
      bgClass: 'bg-green-50',
      text: latestCompletedScheduled?.title
        ? `Ολοκληρώθηκε έργο: ${latestCompletedScheduled.title}`
        : 'Ολοκληρώθηκε Προγραμματισμός Έργου',
      date: d,
      badge: { label: 'Ολοκληρώθηκε', variant: 'secondary' },
    });
  }

  if (latestPendingReceipt) {
    const d = toDate(latestPendingReceipt?.updated_at) || toDate(latestPendingReceipt?.service_date) || toDate(latestPendingReceipt?.created_at) || new Date();
    const contractorName: string | undefined = latestPendingReceipt?.contractor_name || latestPendingReceipt?.contractor?.name;
    activityItems.push({
      key: `receipt-${latestPendingReceipt.id}`,
      icon: <Clock className="w-4 h-4 text-yellow-600" />,
      bgClass: 'bg-yellow-50',
      text: contractorName
        ? `Προστέθηκε νέα απόδειξη από ${contractorName}`
        : 'Προστέθηκε νέα απόδειξη συντήρησης',
      date: d,
      badge: { label: 'Εκκρεμεί', variant: 'outline' },
    });
  }

  if (latestContractor) {
    const d = toDate(latestContractor?.created_at) || toDate(latestContractor?.updated_at) || new Date();
    activityItems.push({
      key: `contractor-${latestContractor.id}`,
      icon: <Users className="w-4 h-4 text-blue-600" />,
      bgClass: 'bg-blue-50',
      text: latestContractor?.name
        ? `Προστέθηκε νέο συνεργείο: ${latestContractor.name}`
        : 'Προστέθηκε νέο συνεργείο',
      date: d,
      badge: { label: 'Νέο', variant: 'secondary' },
    });
  }
  // Count approved projects from offers
  const approvedProjectsCount = extractCount(approvedProjectsQ.data ?? []);
  
  // Count scheduled maintenance that are NOT linked to approved projects to avoid double counting
  const scheduledMaintenanceCount = scheduledRows.length;
  type ScheduledWithProject = ScheduledMaintenanceRow & { linked_project?: number };
  const linkedToProjectsCount = scheduledRows.filter((maintenance: ScheduledWithProject) => maintenance.linked_project).length;
  const unlinkedScheduledCount = scheduledMaintenanceCount - linkedToProjectsCount;
  
  // Total maintenance work = unlinked scheduled maintenance + approved projects
  const totalMaintenanceWork = unlinkedScheduledCount + approvedProjectsCount;

  const baseStats: MaintenanceStats = {
    total_contractors: contractorRows.length,
    active_contractors: contractorRows.filter((c: ContractorRow & { status?: string; is_active?: boolean }) => c.status === 'active' || c.is_active === true).length,
    pending_receipts: extractCount(receiptsQ.data ?? []),
    scheduled_maintenance: totalMaintenanceWork, // Avoid double counting linked projects
    urgent_maintenance: extractCount(urgentScheduledQ.data ?? []),
    completed_maintenance: completedThisYear,
    total_spent: totalServiceSpentThisYear, // Use service expenses for overview tab
  };

  const stats: MaintenanceStats = publicCountersQ.data ? {
    total_contractors: publicCountersQ.data.active_contractors, // public API doesn't expose total; mirror active
    active_contractors: publicCountersQ.data.active_contractors,
    pending_receipts: publicCountersQ.data.pending_receipts,
    scheduled_maintenance: totalMaintenanceWork, // Use the same logic as baseStats to avoid double counting
    urgent_maintenance: publicCountersQ.data.urgent_total,
    completed_maintenance: completedThisYear,
    total_spent: totalServiceSpentThisYear, // Use service expenses for overview tab
  } : baseStats;

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon, 
    color = "default",
    href 
  }: {
    title: string;
    value: string | number;
    description?: string;
    icon: React.ReactNode;
    color?: "default" | "success" | "warning" | "danger";
    href?: string;
  }) => {
    const colorClasses = {
      default: "bg-blue-50 text-blue-600",
      success: "bg-green-50 text-green-600",
      warning: "bg-yellow-50 text-yellow-600",
      danger: "bg-red-50 text-red-600",
    };

    if (href) {
      return (
        <Link href={href} className="block hover:shadow-md transition-shadow">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                {icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </CardContent>
          </Card>
        </Link>
      );
    }

    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Υπηρεσίες & Δαπάνες</h1>
          <p className="text-muted-foreground">
            Διαχείριση Συνεργείων,  Πληρωμές Δαπανών και Προγραμματισμένων Έργων
          </p>
        </div>
        {(isAdmin || isManager) && (
          <div className="flex gap-2">
            <BackButton href="/" />
            <Button asChild>
              <Link href="/maintenance/contractors/new">
                <Users className="w-4 h-4 mr-2" />
                Νέο Συνεργείο
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/maintenance/scheduled/new">
                <Calendar className="w-4 h-4 mr-2" />
                Προγραμματισμός Έργου
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operational-expenses">Όλες οι Δαπάνες</TabsTrigger>
          <TabsTrigger value="overview">Επισκόπηση & Έργα</TabsTrigger>
        </TabsList>
        
        {/* Tab Descriptions */}
        <div className="text-sm text-muted-foreground mt-2">
          {activeTab === 'operational-expenses' && (
            <span>💰 Διαχείριση όλων των δαπανών κτιρίου (λειτουργικές δαπάνες, μηνιαίοι λογαριασμοί, ρεύμα, νερό, θέρμανση)</span>
          )}
          {activeTab === 'overview' && (
            <span>📊 Επισκόπηση συνεργείων, έργων συντήρησης και δαπανών συντήρησης (χωρίς λειτουργικές δαπάνες)</span>
          )}
        </div>
        
        <TabsContent value="operational-expenses" className="space-y-6 mt-6">
          <OperationalExpensesTab buildingId={buildingId} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6 mt-6">

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Συνεργεία"
          value={`${stats.active_contractors}/${stats.total_contractors}`}
          description="Ενεργά συνεργεία"
          icon={<Users className="w-4 h-4" />}
          color="default"
          href="/maintenance/contractors"
        />
        <StatCard
          title="Εκκρεμείς Αποδείξεις"
          value={stats.pending_receipts}
          description={`Αποδείξεις για επεξεργασία — Ολοκληρωμένες: ${extractCount(receiptsCompletedQ.data ?? [])}`}
          icon={<FileText className="w-4 h-4" />}
          color="warning"
          href="/maintenance/receipts"
        />
        <StatCard
          title="Προγραμματισμένα Έργα"
          value={stats.scheduled_maintenance}
          description="Έργα σε εξέλιξη"
          icon={<Calendar className="w-4 h-4" />}
          color="default"
          href="/maintenance/scheduled"
        />
        <StatCard
          title="Επείγοντα Έργα"
          value={stats.urgent_maintenance}
          description="Απαιτούν άμεση προσοχή"
          icon={<AlertTriangle className="w-4 h-4" />}
          color="danger"
          href="/maintenance/scheduled?priority=urgent"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Ολοκληρωμένα Έργα"
          value={stats.completed_maintenance}
          description="Φέτος"
          icon={<CheckCircle className="w-4 h-4" />}
          color="success"
        />
        <StatCard
          title="Συνολικά Έξοδα Συντήρησης"
          value={`€${Math.round(stats.total_spent).toLocaleString('el-GR')}`}
          description="Φέτος (Έργα & Συντήρηση)"
          icon={<TrendingUp className="w-4 h-4" />}
          color="default"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Γρήγορες Ενέργειες</CardTitle>
          <CardDescription>
            Συχνές λειτουργίες για γρήγορη πρόσβαση
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/maintenance/receipts/new">
                <FileText className="w-6 h-6 mb-2" />
                <span>Ανέβασμα Απόδειξης</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/maintenance/contractors">
                <Users className="w-6 h-6 mb-2" />
                <span>Διαχείριση Συνεργείων</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/maintenance/scheduled">
                <Calendar className="w-6 h-6 mb-2" />
                <span>Προγραμματισμένα Έργα</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/maintenance/reports">
                <TrendingUp className="w-6 h-6 mb-2" />
                <span>Reports</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Πρόσφατη Δραστηριότητα</CardTitle>
          <CardDescription>
            Τελευταίες ενημερώσεις και ενέργειες
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">Δεν υπάρχουν πρόσφατες ενέργειες.</div>
          ) : (
            <div className="space-y-4">
              {activityItems.slice(0, 3).map((item) => (
                <div key={item.key} className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${item.bgClass}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{getRelativeTimeEl(item.date)}</p>
                  </div>
                  <Badge variant={item.badge.variant}>{item.badge.label}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MaintenanceDashboard() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <MaintenanceDashboardContent />
      </SubscriptionGate>
    </AuthGate>
  );
} 