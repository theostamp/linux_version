'use client';

import React, { useMemo, useState } from 'react';
import {
  Wallet,
  Download,
  RefreshCw,
  AlertCircle,
  Settings,
  TrendingUp,
  TrendingDown,
  X,
  Euro,
  Calendar,
  FileText,
  Building2,
  Tag,
  Users,
  Percent,
  Package,
  Receipt,
  Wrench,
  Clock,
  Play,
  RotateCcw,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FinanceSummaryCards,
  IncomeByBuildingChart,
  IncomeByCategoryChart,
  ExpensesByCategoryChart,
  YearlyChart,
  RecentTransactions
} from '@/components/office-finance';
import {
  useOfficeFinanceDashboard,
  useYearlySummary,
  useMarkIncomeReceived,
  useMarkExpensePaid,
  useInitializeCategories,
  useCreateExpense,
  useCreateIncome,
  useUpdateExpense,
  useUpdateIncome,
  useDeleteExpense,
  useDeleteIncome,
  useExpenseCategories,
  useIncomeCategories,
  useWarmOfficeFinanceCache,
  EXPENSE_GROUP_LABELS,
  INCOME_GROUP_LABELS,
  type ExpenseCategory,
  type IncomeCategory
} from '@/hooks/useOfficeFinance';
import { useBuildings } from '@/hooks/useBuildings';
import {
  useCreateOfficeBulkJob,
  useExecuteOfficeBulkJob,
  useOfficeBulkJobs,
  useRetryOfficeBulkJob,
  type BulkJob,
  type BulkOperationType,
} from '@/hooks/useOfficeOpsBulk';
import { formatCurrency } from '@/lib/utils';

// Helper function to group categories
function groupCategories<T extends { group_type: string }>(
  categories: T[] | undefined,
  labels: Record<string, string>
): Record<string, T[]> {
  if (!categories) return {};

  const grouped: Record<string, T[]> = {};
  categories.forEach(cat => {
    const group = cat.group_type || 'other';
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(cat);
  });

  // Sort by group order
  const orderedGroups: Record<string, T[]> = {};
  Object.keys(labels).forEach(key => {
    if (grouped[key]) {
      orderedGroups[key] = grouped[key];
    }
  });

  return orderedGroups;
}

// Enhanced Modal Component with glassmorphism design
function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default'
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger';
}) {
  if (!isOpen) return null;

  const headerStyles = {
    default: 'border-slate-200/50 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/80',
    success: 'border-emerald-200/50 dark:border-emerald-700/50 bg-emerald-50/80 dark:bg-emerald-900/30',
    danger: 'border-rose-200/50 dark:border-rose-700/50 bg-rose-50/80 dark:bg-rose-900/30'
  };

  const titleColors = {
    default: 'text-slate-800 dark:text-slate-100',
    success: 'text-emerald-700 dark:text-emerald-300',
    danger: 'text-rose-700 dark:text-rose-300'
  };

  const iconColors = {
    default: 'text-slate-500 dark:text-slate-400',
    success: 'text-emerald-500 dark:text-emerald-400',
    danger: 'text-rose-500 dark:text-rose-400'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/40 animate-in fade-in zoom-in-95 duration-200">
        {/* Glass effect background */}
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl" />

        {/* Content */}
        <div className="relative">
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${headerStyles[variant]}`}>
            <div className="flex items-center gap-3">
              {variant === 'success' && (
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <TrendingUp className={`w-5 h-5 ${iconColors[variant]}`} />
                </div>
              )}
              {variant === 'danger' && (
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50">
                  <TrendingDown className={`w-5 h-5 ${iconColors[variant]}`} />
                </div>
              )}
              <h2 className={`text-xl font-semibold ${titleColors[variant]}`}>{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] bg-white/50 dark:bg-slate-900/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Grouped Select Component
function GroupedCategorySelect({
  value,
  onChange,
  categories,
  groupLabels,
  placeholder = '-- Επιλέξτε κατηγορία --',
  className = ''
}: {
  value: string;
  onChange: (value: string) => void;
  categories: ExpenseCategory[] | IncomeCategory[] | undefined;
  groupLabels: Record<string, string>;
  placeholder?: string;
  className?: string;
}) {
  const grouped = groupCategories(categories, groupLabels);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground
        focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors ${className}`}
    >
      <option value="">{placeholder}</option>
      {Object.entries(grouped).map(([groupKey, cats]) => (
        <optgroup key={groupKey} label={groupLabels[groupKey] || groupKey}>
          {cats.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

const FREQUENT_EXPENSE_CATEGORY_NAMES = [
  'Ενοίκιο Γραφείου',
  'Κοινόχρηστα Γραφείου',
  'ΔΕΗ Γραφείου',
  'Νερό Γραφείου',
  'Τηλεφωνία & Internet',
  'Γραφική Ύλη & Αναλώσιμα',
  'Λογισμικό & Εφαρμογές',
  'Μισθοδοσία',
  'Ασφαλιστικές Εισφορές',
  'Λογιστής',
];

const BULK_OPERATION_OPTIONS: Array<{ value: BulkOperationType; label: string; description: string }> = [
  {
    value: 'issue_monthly_charges',
    label: 'Έκδοση μηνιαίων χρεώσεων',
    description: 'Δημιουργία management fees + reserve charges ανά κτίριο',
  },
  {
    value: 'create_management_fee_incomes',
    label: 'Καταχώρηση αμοιβών γραφείου',
    description: 'Αυτόματη δημιουργία office incomes από αμοιβές διαχείρισης',
  },
  {
    value: 'export_debt_report',
    label: 'Export debt report',
    description: 'Συγκεντρωτική εικόνα οφειλών και buckets ανά κτίριο',
  },
];

const BULK_STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
  previewed: { label: 'Dry-run OK', className: 'bg-blue-100 text-blue-700' },
  running: { label: 'Running', className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
  partial: { label: 'Partial', className: 'bg-orange-100 text-orange-700' },
  failed: { label: 'Failed', className: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-200 text-slate-700' },
};

function getBulkStatusMeta(status: string) {
  return BULK_STATUS_META[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
}

function AccordionSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      <Collapsible defaultOpen={defaultOpen}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <CollapsibleTrigger />
        </div>
        <CollapsibleContent>
          <div className="pt-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function getShare(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (value / total) * 100);
}

function SummaryCard({
  title,
  description,
  value,
  share,
  icon: Icon,
  chipClassName,
  iconClassName,
  barClassName,
  footer,
}: {
  title: string;
  description: string;
  value: number;
  share: number;
  icon: React.ElementType;
  chipClassName: string;
  iconClassName: string;
  barClassName: string;
  footer?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={`p-2 rounded-lg ${chipClassName}`}>
          <Icon className={`w-4 h-4 ${iconClassName}`} />
        </div>
      </div>
      <div className="mt-3 text-lg font-semibold text-foreground">{formatCurrency(value)}</div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${barClassName}`} style={{ width: `${share}%` }} />
        </div>
        <span className="text-xs text-muted-foreground w-10 text-right">{share.toFixed(0)}%</span>
      </div>
      {footer && <p className="mt-2 text-xs text-muted-foreground">{footer}</p>}
    </div>
  );
}

function OfficeFinanceContent() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showEditIncomeModal, setShowEditIncomeModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);

  // Form states for create
  const [incomeForm, setIncomeForm] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    building: '',
    description: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    is_paid: true,
  });

  // Form states for edit
  const [editIncomeForm, setEditIncomeForm] = useState({
    title: '',
    amount: '',
    date: '',
    category: '',
    building: '',
    description: '',
    status: 'pending',
  });

  const [editExpenseForm, setEditExpenseForm] = useState({
    title: '',
    amount: '',
    date: '',
    category: '',
    description: '',
    is_paid: false,
  });

  const [bulkOperation, setBulkOperation] = useState<BulkOperationType>('issue_monthly_charges');
  const [bulkBuildingId, setBulkBuildingId] = useState('');
  const [bulkMonth, setBulkMonth] = useState(new Date().toISOString().slice(0, 7));

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isError,
    error,
    refetch
  } = useOfficeFinanceDashboard();

  const {
    data: yearlySummary,
    isLoading: isYearlyLoading
  } = useYearlySummary(selectedYear);

  const markReceivedMutation = useMarkIncomeReceived();
  const markPaidMutation = useMarkExpensePaid();
  const initCategoriesMutation = useInitializeCategories();
  const createExpenseMutation = useCreateExpense();
  const createIncomeMutation = useCreateIncome();
  const updateExpenseMutation = useUpdateExpense();
  const updateIncomeMutation = useUpdateIncome();
  const deleteExpenseMutation = useDeleteExpense();
  const deleteIncomeMutation = useDeleteIncome();
  const warmOfficeFinanceCacheMutation = useWarmOfficeFinanceCache();

  // Categories & Buildings for dropdowns
  const { data: expenseCategories } = useExpenseCategories();
  const { data: incomeCategories } = useIncomeCategories();
  const { buildings } = useBuildings();
  const { data: bulkJobs, isLoading: isBulkJobsLoading } = useOfficeBulkJobs();
  const createBulkJobMutation = useCreateOfficeBulkJob();
  const executeBulkJobMutation = useExecuteOfficeBulkJob();
  const retryBulkJobMutation = useRetryOfficeBulkJob();

  const frequentExpenseCategories = useMemo(() => {
    if (!expenseCategories?.length) return [];
    const byName = new Map(expenseCategories.map((category) => [category.name, category]));
    const selected: ExpenseCategory[] = [];
    const usedIds = new Set<number>();

    FREQUENT_EXPENSE_CATEGORY_NAMES.forEach((name) => {
      const match = byName.get(name);
      if (match && !usedIds.has(match.id)) {
        usedIds.add(match.id);
        selected.push(match);
      }
    });

    return selected;
  }, [expenseCategories]);

  const incomeGroupTotals = useMemo(() => {
    if (!dashboardData?.income_by_category) return null;
    return dashboardData.income_by_category.reduce((acc, item) => {
      const group = item.group_type || 'other';
      acc[group] = (acc[group] || 0) + item.total;
      return acc;
    }, {} as Record<string, number>);
  }, [dashboardData?.income_by_category]);

  const incomeGroupsTotal = useMemo(() => {
    if (!incomeGroupTotals) return 0;
    return Object.values(incomeGroupTotals).reduce((sum, value) => sum + value, 0);
  }, [incomeGroupTotals]);

  const expenseGroupTotals = useMemo(() => {
    if (!dashboardData?.expenses_by_category || !expenseCategories) return null;
    const categoryToGroup = new Map(
      expenseCategories.map((category) => [category.id, category.group_type || 'other'])
    );
    return dashboardData.expenses_by_category.reduce((acc, item) => {
      const group = categoryToGroup.get(item.category_id) || 'other';
      acc[group] = (acc[group] || 0) + item.total;
      return acc;
    }, {} as Record<string, number>);
  }, [dashboardData?.expenses_by_category, expenseCategories]);

  const expenseGroupsTotal = useMemo(() => {
    if (!expenseGroupTotals) return 0;
    return Object.values(expenseGroupTotals).reduce((sum, value) => sum + value, 0);
  }, [expenseGroupTotals]);

  const payrollTotal = expenseGroupTotals?.staff ?? 0;
  const collaboratorsTotal = (expenseGroupTotals?.collaborators ?? 0) + (expenseGroupTotals?.suppliers ?? 0);
  const operationsTotal = (expenseGroupTotals?.operational ?? 0) + (expenseGroupTotals?.fixed ?? 0);
  const taxesTotal = expenseGroupTotals?.taxes_legal ?? 0;

  const incomeSummaryCards = [
    {
      key: 'building_fees',
      title: 'Αμοιβές Διαχείρισης',
      description: 'Έσοδα από πολυκατοικίες',
      value: incomeGroupTotals?.building_fees ?? 0,
      icon: Building2,
      chipClassName: 'bg-emerald-100/70',
      iconClassName: 'text-emerald-600',
      barClassName: 'bg-emerald-500',
    },
    {
      key: 'commissions',
      title: 'Προμήθειες Συνεργείων',
      description: 'Ποσοστά συνεργατών',
      value: incomeGroupTotals?.commissions ?? 0,
      icon: Percent,
      chipClassName: 'bg-violet-100/70',
      iconClassName: 'text-violet-600',
      barClassName: 'bg-violet-500',
    },
    {
      key: 'product_sales',
      title: 'Πωλήσεις Προϊόντων',
      description: 'Καθαριστικά & αναλώσιμα',
      value: incomeGroupTotals?.product_sales ?? 0,
      icon: Package,
      chipClassName: 'bg-amber-100/70',
      iconClassName: 'text-amber-600',
      barClassName: 'bg-amber-500',
    },
    {
      key: 'services',
      title: 'Υπηρεσίες Γραφείου',
      description: 'Πιστοποιητικά & επίβλεψη',
      value: incomeGroupTotals?.services ?? 0,
      icon: FileText,
      chipClassName: 'bg-blue-100/70',
      iconClassName: 'text-blue-600',
      barClassName: 'bg-blue-500',
    },
  ];

  const expenseSummaryCards = [
    {
      key: 'staff',
      title: 'Μισθοδοσία & Εισφορές',
      description: 'Μισθοί, εισφορές, παροχές',
      value: payrollTotal,
      icon: Users,
      chipClassName: 'bg-indigo-100/70',
      iconClassName: 'text-indigo-600',
      barClassName: 'bg-indigo-500',
      footer: 'Βάσει πληρωμένων εξόδων',
    },
    {
      key: 'collaborators',
      title: 'Αμοιβές Συνεργατών',
      description: 'Συνεργεία & προμηθευτές',
      value: collaboratorsTotal,
      icon: Wrench,
      chipClassName: 'bg-amber-100/70',
      iconClassName: 'text-amber-600',
      barClassName: 'bg-amber-500',
    },
    {
      key: 'operations',
      title: 'Λειτουργικά & Πάγια',
      description: 'Ενοίκια, λογαριασμοί, εξοπλισμός',
      value: operationsTotal,
      icon: Building2,
      chipClassName: 'bg-slate-100',
      iconClassName: 'text-slate-600',
      barClassName: 'bg-slate-500',
    },
    {
      key: 'taxes_legal',
      title: 'Φόροι & Νομικά',
      description: 'Φόροι, πρόστιμα, νομικά',
      value: taxesTotal,
      icon: Receipt,
      chipClassName: 'bg-rose-100/70',
      iconClassName: 'text-rose-600',
      barClassName: 'bg-rose-500',
    },
  ];

  const handleMarkReceived = async (id: number) => {
    try {
      await markReceivedMutation.mutateAsync({ id });
      toast.success('Το έσοδο σημειώθηκε ως εισπραχθέν');
    } catch (error) {
      console.error('Failed to mark income as received:', error);
      toast.error('Αποτυχία ενημέρωσης εσόδου');
    }
  };

  const handleMarkPaid = async (id: number) => {
    try {
      await markPaidMutation.mutateAsync({ id });
      toast.success('Το έξοδο σημειώθηκε ως πληρωμένο');
    } catch (error) {
      console.error('Failed to mark expense as paid:', error);
      toast.error('Αποτυχία ενημέρωσης εξόδου');
    }
  };

  const handleEditExpense = (id: number) => {
    // Find expense from recent expenses or unpaid expenses
    const expense = dashboardData?.recent_expenses?.find(e => e.id === id)
      || dashboardData?.unpaid_expenses?.find(e => e.id === id);

    if (expense) {
      setEditingExpenseId(id);
      setEditExpenseForm({
        title: expense.title,
        amount: expense.amount.toString(),
        date: expense.date,
        category: '', // Will need to fetch full expense for category
        description: '',
        is_paid: expense.is_paid,
      });
      setShowEditExpenseModal(true);
    } else {
      toast.error('Δεν βρέθηκε το έξοδο');
    }
  };

  const handleEditIncome = (id: number) => {
    // Find income from recent incomes or pending incomes
    const income = dashboardData?.recent_incomes?.find(i => i.id === id)
      || dashboardData?.pending_incomes?.find(i => i.id === id);

    if (income) {
      setEditingIncomeId(id);
      setEditIncomeForm({
        title: income.title,
        amount: income.amount.toString(),
        date: income.date,
        category: '',
        building: '',
        description: '',
        status: 'status' in income ? income.status : 'pending',
      });
      setShowEditIncomeModal(true);
    } else {
      toast.error('Δεν βρέθηκε το έσοδο');
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseId || !editExpenseForm.title || !editExpenseForm.amount) {
      toast.error('Συμπληρώστε τα υποχρεωτικά πεδία');
      return;
    }
    try {
      await updateExpenseMutation.mutateAsync({
        id: editingExpenseId,
        data: {
          title: editExpenseForm.title,
          amount: parseFloat(editExpenseForm.amount),
          date: editExpenseForm.date,
          category: editExpenseForm.category ? parseInt(editExpenseForm.category) : undefined,
          description: editExpenseForm.description,
          is_paid: editExpenseForm.is_paid,
        },
      });
      toast.success('Το έξοδο ενημερώθηκε επιτυχώς');
      setShowEditExpenseModal(false);
      setEditingExpenseId(null);
    } catch (error) {
      console.error('Failed to update expense:', error);
      toast.error('Αποτυχία ενημέρωσης εξόδου');
    }
  };

  const handleUpdateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncomeId || !editIncomeForm.title || !editIncomeForm.amount) {
      toast.error('Συμπληρώστε τα υποχρεωτικά πεδία');
      return;
    }
    try {
      await updateIncomeMutation.mutateAsync({
        id: editingIncomeId,
        data: {
          title: editIncomeForm.title,
          amount: parseFloat(editIncomeForm.amount),
          date: editIncomeForm.date,
          category: editIncomeForm.category ? parseInt(editIncomeForm.category) : undefined,
          building: editIncomeForm.building ? parseInt(editIncomeForm.building) : undefined,
          description: editIncomeForm.description,
          status: editIncomeForm.status as 'pending' | 'received',
        },
      });
      toast.success('Το έσοδο ενημερώθηκε επιτυχώς');
      setShowEditIncomeModal(false);
      setEditingIncomeId(null);
    } catch (error) {
      console.error('Failed to update income:', error);
      toast.error('Αποτυχία ενημέρωσης εσόδου');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await deleteExpenseMutation.mutateAsync(id);
      toast.success('Το έξοδο διαγράφηκε επιτυχώς');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast.error('Αποτυχία διαγραφής εξόδου');
    }
  };

  const handleDeleteIncome = async (id: number) => {
    try {
      await deleteIncomeMutation.mutateAsync(id);
      toast.success('Το έσοδο διαγράφηκε επιτυχώς');
    } catch (error) {
      console.error('Failed to delete income:', error);
      toast.error('Αποτυχία διαγραφής εσόδου');
    }
  };

  const handleInitCategories = async () => {
    try {
      await initCategoriesMutation.mutateAsync();
      toast.success('Οι κατηγορίες αρχικοποιήθηκαν επιτυχώς');
    } catch (error) {
      console.error('Failed to initialize categories:', error);
      toast.error('Αποτυχία αρχικοποίησης κατηγοριών');
    }
  };

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.title || !incomeForm.amount) {
      toast.error('Συμπληρώστε τα υποχρεωτικά πεδία');
      return;
    }
    try {
      await createIncomeMutation.mutateAsync({
        title: incomeForm.title,
        amount: parseFloat(incomeForm.amount),
        date: incomeForm.date,
        category: incomeForm.category ? parseInt(incomeForm.category) : undefined,
        building: incomeForm.building ? parseInt(incomeForm.building) : undefined,
        description: incomeForm.description,
        status: 'pending',
      });
      toast.success('Το έσοδο δημιουργήθηκε επιτυχώς');
      setShowIncomeModal(false);
      setIncomeForm({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: '', building: '', description: '' });
    } catch (error) {
      console.error('Failed to create income:', error);
      toast.error('Αποτυχία δημιουργίας εσόδου');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) {
      toast.error('Συμπληρώστε τα υποχρεωτικά πεδία');
      return;
    }
    try {
      await createExpenseMutation.mutateAsync({
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        date: expenseForm.date,
        category: expenseForm.category ? parseInt(expenseForm.category) : undefined,
        description: expenseForm.description,
        is_paid: expenseForm.is_paid,
      });
      toast.success('Το έξοδο δημιουργήθηκε επιτυχώς');
      setShowExpenseModal(false);
      setExpenseForm({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: '', description: '', is_paid: true });
    } catch (error) {
      console.error('Failed to create expense:', error);
      toast.error('Αποτυχία δημιουργίας εξόδου');
    }
  };

  const handleExport = () => {
    // Simple CSV export of dashboard data
    if (!dashboardData) {
      toast.error('Δεν υπάρχουν δεδομένα για εξαγωγή');
      return;
    }

    const data = [
      ['Κέντρο Ελέγχου - Αναφορά'],
      [''],
      ['Τρέχων Μήνας'],
      ['Έσοδα', dashboardData.current_month?.income?.total || 0],
      ['Έξοδα', dashboardData.current_month?.expenses?.total || 0],
      ['Καθαρό Αποτέλεσμα', dashboardData.current_month?.net_result || 0],
    ];

    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `office-finance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Η εξαγωγή ολοκληρώθηκε');
  };

  const handleWarmOfficeFinanceCache = async () => {
    try {
      await warmOfficeFinanceCacheMutation.mutateAsync(selectedYear);
      toast.success('Ξεκίνησε cache warm-up στο backend');
    } catch (error) {
      console.error('Failed to warm office finance cache:', error);
      toast.error('Αποτυχία warm-up');
    }
  };

  const handleCreateBulkDryRun = async () => {
    try {
      await createBulkJobMutation.mutateAsync({
        operation_type: bulkOperation,
        building_id: bulkBuildingId ? parseInt(bulkBuildingId, 10) : undefined,
        month: bulkMonth || undefined,
        auto_dry_run: true,
      });
      toast.success('Το dry-run δημιουργήθηκε επιτυχώς');
    } catch (error) {
      console.error('Failed to create bulk dry-run:', error);
      toast.error('Αποτυχία δημιουργίας dry-run');
    }
  };

  const handleExecuteBulkJob = async (job: BulkJob) => {
    try {
      await executeBulkJobMutation.mutateAsync(job.id);
      toast.success('Η μαζική εργασία μπήκε σε ουρά εκτέλεσης');
    } catch (error) {
      console.error('Failed to execute bulk job:', error);
      toast.error('Αποτυχία εκτέλεσης bulk job');
    }
  };

  const handleRetryBulkJob = async (job: BulkJob) => {
    try {
      await retryBulkJobMutation.mutateAsync(job.id);
      toast.success('Το retry μπήκε σε ουρά');
    } catch (error) {
      console.error('Failed to retry bulk job:', error);
      toast.error('Αποτυχία retry');
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Σφάλμα φόρτωσης</h2>
        <p className="text-muted-foreground mb-4">
          {error?.message || 'Δεν ήταν δυνατή η φόρτωση των οικονομικών στοιχείων'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Επανάληψη
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl shadow-lg shadow-primary/20">
            <Wallet className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title-sm">Κέντρο Ελέγχου</h1>
            <p className="text-muted-foreground">Οικονομική εποπτεία, μισθοδοσία και λειτουργικές ροές του γραφείου</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleInitCategories}
            disabled={initCategoriesMutation.isPending}
            className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Αρχικοποίηση προεπιλεγμένων κατηγοριών"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Κατηγορίες</span>
          </button>

          <button
            onClick={() => refetch()}
            disabled={isDashboardLoading}
            className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isDashboardLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Ανανέωση</span>
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Εξαγωγή</span>
          </button>

          <button
            onClick={handleWarmOfficeFinanceCache}
            disabled={warmOfficeFinanceCacheMutation.isPending}
            className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Προθέρμανση cache για dashboard και yearly summary"
          >
            <Clock className={`w-4 h-4 ${warmOfficeFinanceCacheMutation.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Warm Cache</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setShowIncomeModal(true)}
              className="px-4 py-2 bg-success hover:bg-success/90 text-success-foreground rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-success/20"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Νέο Έσοδο</span>
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-destructive/20"
            >
              <TrendingDown className="w-4 h-4" />
              <span>Νέο Έξοδο</span>
            </button>
          </div>
        </div>
      </div>

      <AccordionSection
        title="Bulk Center"
        description="Dry-run -> execute -> retry για μαζικές εργασίες γραφείου"
        defaultOpen
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Operation
              </label>
              <select
                value={bulkOperation}
                onChange={(event) => setBulkOperation(event.target.value as BulkOperationType)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
              >
                {BULK_OPERATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {BULK_OPERATION_OPTIONS.find((option) => option.value === bulkOperation)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Scope
              </label>
              <select
                value={bulkBuildingId}
                onChange={(event) => setBulkBuildingId(event.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
              >
                <option value="">Όλα τα κτίρια</option>
                {buildings?.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Μήνας
              </label>
              <input
                type="month"
                value={bulkMonth}
                onChange={(event) => setBulkMonth(event.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={handleCreateBulkDryRun}
              disabled={createBulkJobMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Layers className="w-4 h-4" />
              {createBulkJobMutation.isPending ? 'Δημιουργία...' : 'Dry-run Preview'}
            </button>

            <p className="text-xs text-muted-foreground">
              Η εκτέλεση επιτρέπεται μόνο αφού ολοκληρωθεί dry-run.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Πρόσφατα Bulk Jobs</h3>
              {isBulkJobsLoading && <span className="text-xs text-muted-foreground">Φόρτωση...</span>}
            </div>

            {!bulkJobs?.length ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Δεν υπάρχουν bulk jobs ακόμη.
              </div>
            ) : (
              <div className="space-y-2">
                {bulkJobs.slice(0, 8).map((job) => {
                  const statusMeta = getBulkStatusMeta(job.status);
                  const canExecute = job.dry_run_completed && ['previewed', 'partial', 'failed'].includes(job.status);
                  const canRetry = ['partial', 'failed'].includes(job.status) || (job.counts?.failed || 0) > 0;

                  return (
                    <div
                      key={job.id}
                      className="rounded-lg border border-border bg-card/60 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {BULK_OPERATION_OPTIONS.find((option) => option.value === job.operation_type)?.label || job.operation_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {job.month} • {job.building_name || 'All buildings'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          validated: {job.counts?.validated ?? 0} • executed: {job.counts?.executed ?? 0} • failed: {job.counts?.failed ?? 0}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleExecuteBulkJob(job)}
                          disabled={!canExecute || executeBulkJobMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Execute
                        </button>
                        <button
                          onClick={() => handleRetryBulkJob(job)}
                          disabled={!canRetry || retryBulkJobMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Retry
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Σύνοψη Μήνα"
        description="Βασικοί δείκτες εσόδων, εξόδων και καθαρού αποτελέσματος"
        defaultOpen
      >
        <FinanceSummaryCards
          currentMonth={dashboardData?.current_month || null}
          previousMonth={dashboardData?.previous_month || null}
        />
      </AccordionSection>

      <AccordionSection
        title="Ροές Εσόδων"
        description="Αμοιβές διαχείρισης, προμήθειες, πωλήσεις προϊόντων και υπηρεσίες γραφείου"
        defaultOpen
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {incomeSummaryCards.map((card) => (
              <SummaryCard
                key={card.key}
                title={card.title}
                description={card.description}
                value={card.value}
                share={getShare(card.value, incomeGroupsTotal)}
                icon={card.icon}
                chipClassName={card.chipClassName}
                iconClassName={card.iconClassName}
                barClassName={card.barClassName}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <IncomeByBuildingChart
              data={dashboardData?.income_by_building || null}
              isLoading={isDashboardLoading}
            />
            <IncomeByCategoryChart
              data={dashboardData?.income_by_category || null}
              isLoading={isDashboardLoading}
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Δαπάνες & Μισθοδοσία"
        description="Λειτουργικά, συνεργάτες, φόροι και μισθοδοσία σε ενιαία εικόνα"
        defaultOpen
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {expenseSummaryCards.map((card) => (
              <SummaryCard
                key={card.key}
                title={card.title}
                description={card.description}
                value={card.value}
                share={getShare(card.value, expenseGroupsTotal)}
                icon={card.icon}
                chipClassName={card.chipClassName}
                iconClassName={card.iconClassName}
                barClassName={card.barClassName}
                footer={card.footer}
              />
            ))}
          </div>
          <ExpensesByCategoryChart
            data={dashboardData?.expenses_by_category || null}
            isLoading={isDashboardLoading}
          />
        </div>
      </AccordionSection>

      <AccordionSection
        title="Προσωπικό & Ωράρια"
        description="Μισθοδοσία, ωράρια και άδειες προσωπικού"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100/70">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Μισθοδοσία</p>
                  <p className="text-xs text-muted-foreground">Μισθοί & εισφορές μήνα</p>
                </div>
              </div>
            </div>
            <div className="mt-3 text-lg font-semibold text-foreground">{formatCurrency(payrollTotal)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Βάσει πληρωμένων εξόδων</p>
          </div>

          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100/70">
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Ωράρια Προσωπικού</p>
                  <p className="text-xs text-muted-foreground">Βάρδιες & υπερωρίες</p>
                </div>
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Σύντομα</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Ορισμός εβδομαδιαίων βαρδιών και παρακολούθηση υπερωριών.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100/70">
                  <Clock className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Άδειες & Απουσίες</p>
                  <p className="text-xs text-muted-foreground">Αιτήσεις & υπόλοιπα</p>
                </div>
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Σύντομα</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Καταγραφή αιτημάτων και αυτόματη ενημέρωση υπολοίπων.
            </p>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Ετήσια Απόδοση"
        description="Συγκριτική εικόνα μήνα προς μήνα"
        defaultOpen={false}
      >
        <YearlyChart
          data={yearlySummary || dashboardData?.yearly_summary || null}
          isLoading={isDashboardLoading || isYearlyLoading}
          onYearChange={setSelectedYear}
        />
      </AccordionSection>

      <AccordionSection
        title="Κινήσεις & Εκκρεμότητες"
        description="Πρόσφατες συναλλαγές και πληρωμές που εκκρεμούν"
        defaultOpen={false}
      >
        <RecentTransactions
          recentExpenses={dashboardData?.recent_expenses || null}
          recentIncomes={dashboardData?.recent_incomes || null}
          pendingIncomes={dashboardData?.pending_incomes || null}
          unpaidExpenses={dashboardData?.unpaid_expenses || null}
          isLoading={isDashboardLoading}
          onMarkReceived={handleMarkReceived}
          onMarkPaid={handleMarkPaid}
          onEditExpense={handleEditExpense}
          onEditIncome={handleEditIncome}
          onDeleteExpense={handleDeleteExpense}
          onDeleteIncome={handleDeleteIncome}
        />
      </AccordionSection>

      {dashboardData && (
        <AccordionSection
          title="Συνοπτικά Στατιστικά"
          description="Γρήγορη εικόνα εκκρεμοτήτων και κερδοφορίας"
          defaultOpen={false}
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-card/50 rounded-xl border border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {dashboardData.income_by_building?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Κτίρια με έσοδα</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {dashboardData.expenses_by_category?.reduce((sum, c) => sum + c.count, 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Έξοδα μήνα</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {dashboardData.pending_incomes?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Εκκρεμή έσοδα</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">
                {dashboardData.unpaid_expenses?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Προς πληρωμή</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">
                {dashboardData.yearly_summary?.monthly_data?.filter(m => m.net > 0).length || 0}/12
              </p>
              <p className="text-sm text-muted-foreground">Κερδοφόροι μήνες</p>
            </div>
          </div>
        </AccordionSection>
      )}

      {/* Income Modal */}
      <Modal isOpen={showIncomeModal} onClose={() => setShowIncomeModal(false)} title="Νέο Έσοδο" variant="success">
        <form onSubmit={handleCreateIncome} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <FileText className="w-4 h-4 inline mr-1.5 text-emerald-600" />
              Τίτλος *
            </label>
            <input
              type="text"
              value={incomeForm.title}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
              placeholder="π.χ. Αμοιβή διαχείρισης Ιανουαρίου"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Euro className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                Ποσό (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Calendar className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                Ημερομηνία
              </label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Tag className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                Κατηγορία
              </label>
              <GroupedCategorySelect
                value={incomeForm.category}
                onChange={(value) => setIncomeForm(prev => ({ ...prev, category: value }))}
                categories={incomeCategories}
                groupLabels={INCOME_GROUP_LABELS}
                placeholder="-- Επιλέξτε κατηγορία --"
                className="!bg-white dark:!bg-slate-800 !border-2 !border-slate-200 dark:!border-gray-200 !rounded-xl !text-slate-900 dark:!text-slate-100 focus:!ring-2 focus:!ring-emerald-500/30 focus:!border-emerald-500 !shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Building2 className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                Κτίριο
              </label>
              <select
                value={incomeForm.building}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, building: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
              >
                <option value="">-- Επιλέξτε --</option>
                {buildings?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Περιγραφή</label>
            <textarea
              value={incomeForm.description}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm resize-none"
              placeholder="Προαιρετική περιγραφή..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowIncomeModal(false)}
              className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={createIncomeMutation.isPending}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg shadow-emerald-600/20"
            >
              {createIncomeMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Νέο Έξοδο" variant="danger">
        <form onSubmit={handleCreateExpense} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <FileText className="w-4 h-4 inline mr-1.5 text-rose-600" />
              Τίτλος *
            </label>
            <input
              type="text"
              value={expenseForm.title}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-sm"
              placeholder="π.χ. Λογαριασμός ΔΕΗ"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Euro className="w-4 h-4 inline mr-1.5 text-rose-600" />
                Ποσό (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Calendar className="w-4 h-4 inline mr-1.5 text-rose-600" />
                Ημερομηνία
              </label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <Tag className="w-4 h-4 inline mr-1.5 text-rose-600" />
              Κατηγορία
            </label>
            <GroupedCategorySelect
              value={expenseForm.category}
              onChange={(value) => setExpenseForm(prev => ({ ...prev, category: value }))}
              categories={expenseCategories}
              groupLabels={EXPENSE_GROUP_LABELS}
              placeholder="-- Επιλέξτε κατηγορία --"
              className="!bg-white dark:!bg-slate-800 !border-2 !border-slate-200 dark:!border-gray-200 !rounded-xl !text-slate-900 dark:!text-slate-100 focus:!ring-2 focus:!ring-rose-500/30 focus:!border-rose-500 !shadow-sm"
            />
          </div>

          {frequentExpenseCategories.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Συχνές κατηγορίες
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Γρήγορη επιλογή</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {frequentExpenseCategories.map((category) => {
                  const isSelected = expenseForm.category === String(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setExpenseForm(prev => ({ ...prev, category: String(category.id) }))}
                      aria-pressed={isSelected}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700'
                          : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-rose-50 hover:border-rose-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-rose-900/20'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Περιγραφή</label>
            <textarea
              value={expenseForm.description}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-sm resize-none"
              placeholder="Προαιρετική περιγραφή..."
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <input
              type="checkbox"
              id="is_paid"
              checked={expenseForm.is_paid}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, is_paid: e.target.checked }))}
              className="w-5 h-5 rounded-lg border-2 border-amber-300 bg-white dark:bg-slate-800 text-amber-600 focus:ring-amber-500/50 cursor-pointer"
            />
            <label htmlFor="is_paid" className="text-sm font-medium text-amber-800 dark:text-amber-200 cursor-pointer">
              Έχει πληρωθεί
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowExpenseModal(false)}
              className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg shadow-rose-600/20"
            >
              {createExpenseMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Income Modal */}
      <Modal
        isOpen={showEditIncomeModal}
        onClose={() => {
          setShowEditIncomeModal(false);
          setEditingIncomeId(null);
        }}
        title="Επεξεργασία Εσόδου"
        variant="success"
      >
        <form onSubmit={handleUpdateIncome} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <FileText className="w-4 h-4 inline mr-1.5 text-emerald-600" />
              Τίτλος *
            </label>
            <input
              type="text"
              value={editIncomeForm.title}
              onChange={(e) => setEditIncomeForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
              placeholder="π.χ. Αμοιβή διαχείρισης Ιανουαρίου"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Euro className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                Ποσό (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={editIncomeForm.amount}
                onChange={(e) => setEditIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Calendar className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                Ημερομηνία
              </label>
              <input
                type="date"
                value={editIncomeForm.date}
                onChange={(e) => setEditIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Tag className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                Κατηγορία
              </label>
              <GroupedCategorySelect
                value={editIncomeForm.category}
                onChange={(value) => setEditIncomeForm(prev => ({ ...prev, category: value }))}
                categories={incomeCategories}
                groupLabels={INCOME_GROUP_LABELS}
                placeholder="-- Επιλέξτε κατηγορία --"
                className="!bg-white dark:!bg-slate-800 !border-2 !border-slate-200 dark:!border-gray-200 !rounded-xl !text-slate-900 dark:!text-slate-100 focus:!ring-2 focus:!ring-emerald-500/30 focus:!border-emerald-500 !shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Building2 className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                Κτίριο
              </label>
              <select
                value={editIncomeForm.building}
                onChange={(e) => setEditIncomeForm(prev => ({ ...prev, building: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
              >
                <option value="">-- Επιλέξτε --</option>
                {buildings?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
            <input
              type="checkbox"
              id="edit_income_status"
              checked={editIncomeForm.status === 'received'}
              onChange={(e) => setEditIncomeForm(prev => ({ ...prev, status: e.target.checked ? 'received' : 'pending' }))}
              className="w-5 h-5 rounded-lg border-2 border-teal-300 bg-white dark:bg-slate-800 text-teal-600 focus:ring-teal-500/50 cursor-pointer"
            />
            <label htmlFor="edit_income_status" className="text-sm font-medium text-teal-800 dark:text-teal-200 cursor-pointer">
              Έχει εισπραχθεί
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Περιγραφή</label>
            <textarea
              value={editIncomeForm.description}
              onChange={(e) => setEditIncomeForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm resize-none"
              placeholder="Προαιρετική περιγραφή..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setShowEditIncomeModal(false);
                setEditingIncomeId(null);
              }}
              className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={updateIncomeMutation.isPending}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg shadow-emerald-600/20"
            >
              {updateIncomeMutation.isPending ? 'Ενημέρωση...' : 'Ενημέρωση'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={showEditExpenseModal}
        onClose={() => {
          setShowEditExpenseModal(false);
          setEditingExpenseId(null);
        }}
        title="Επεξεργασία Εξόδου"
        variant="danger"
      >
        <form onSubmit={handleUpdateExpense} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <FileText className="w-4 h-4 inline mr-1.5 text-rose-600" />
              Τίτλος *
            </label>
            <input
              type="text"
              value={editExpenseForm.title}
              onChange={(e) => setEditExpenseForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-sm"
              placeholder="π.χ. Λογαριασμός ΔΕΗ"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Euro className="w-4 h-4 inline mr-1.5 text-rose-600" />
                Ποσό (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={editExpenseForm.amount}
                onChange={(e) => setEditExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <Calendar className="w-4 h-4 inline mr-1.5 text-rose-600" />
                Ημερομηνία
              </label>
              <input
                type="date"
                value={editExpenseForm.date}
                onChange={(e) => setEditExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <Tag className="w-4 h-4 inline mr-1.5 text-rose-600" />
              Κατηγορία
            </label>
            <GroupedCategorySelect
              value={editExpenseForm.category}
              onChange={(value) => setEditExpenseForm(prev => ({ ...prev, category: value }))}
              categories={expenseCategories}
              groupLabels={EXPENSE_GROUP_LABELS}
              placeholder="-- Επιλέξτε κατηγορία --"
              className="!bg-white dark:!bg-slate-800 !border-2 !border-slate-200 dark:!border-gray-200 !rounded-xl !text-slate-900 dark:!text-slate-100 focus:!ring-2 focus:!ring-rose-500/30 focus:!border-rose-500 !shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Περιγραφή</label>
            <textarea
              value={editExpenseForm.description}
              onChange={(e) => setEditExpenseForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-sm resize-none"
              placeholder="Προαιρετική περιγραφή..."
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <input
              type="checkbox"
              id="edit_is_paid"
              checked={editExpenseForm.is_paid}
              onChange={(e) => setEditExpenseForm(prev => ({ ...prev, is_paid: e.target.checked }))}
              className="w-5 h-5 rounded-lg border-2 border-amber-300 bg-white dark:bg-slate-800 text-amber-600 focus:ring-amber-500/50 cursor-pointer"
            />
            <label htmlFor="edit_is_paid" className="text-sm font-medium text-amber-800 dark:text-amber-200 cursor-pointer">
              Έχει πληρωθεί
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setShowEditExpenseModal(false);
                setEditingExpenseId(null);
              }}
              className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={updateExpenseMutation.isPending}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg shadow-rose-600/20"
            >
              {updateExpenseMutation.isPending ? 'Ενημέρωση...' : 'Ενημέρωση'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function OfficeFinancePage() {
  return (
    <DashboardErrorBoundary>
      <OfficeFinanceContent />
    </DashboardErrorBoundary>
  );
}
