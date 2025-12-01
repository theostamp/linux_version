'use client';

import React, { useState } from 'react';
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
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import { 
  FinanceSummaryCards,
  IncomeByBuildingChart,
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
  useExpenseCategories,
  useIncomeCategories,
  EXPENSE_GROUP_LABELS,
  INCOME_GROUP_LABELS,
  type ExpenseCategory,
  type IncomeCategory
} from '@/hooks/useOfficeFinance';
import { useBuildings } from '@/hooks/useBuildings';

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

function OfficeFinanceContent() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // Form states
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
  
  // Categories & Buildings for dropdowns
  const { data: expenseCategories } = useExpenseCategories();
  const { data: incomeCategories } = useIncomeCategories();
  const { buildings } = useBuildings();

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
    // TODO: Implement edit modal for expenses
    toast.info(`Επεξεργασία εξόδου #${id} - Σύντομα διαθέσιμο`);
  };

  const handleEditIncome = (id: number) => {
    // TODO: Implement edit modal for incomes
    toast.info(`Επεξεργασία εσόδου #${id} - Σύντομα διαθέσιμο`);
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
      ['Οικονομικά Γραφείου - Αναφορά'],
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
            <h1 className="text-2xl font-bold text-foreground">Οικονομικά Γραφείου</h1>
            <p className="text-muted-foreground">Διαχείριση εσόδων και εξόδων του γραφείου διαχείρισης</p>
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

      {/* Summary Cards */}
      <FinanceSummaryCards
        currentMonth={dashboardData?.current_month || null}
        previousMonth={dashboardData?.previous_month || null}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Building */}
        <IncomeByBuildingChart
          data={dashboardData?.income_by_building || null}
          isLoading={isDashboardLoading}
        />

        {/* Expenses by Category */}
        <ExpensesByCategoryChart
          data={dashboardData?.expenses_by_category || null}
          isLoading={isDashboardLoading}
        />
      </div>

      {/* Yearly Chart */}
      <YearlyChart
        data={yearlySummary || dashboardData?.yearly_summary || null}
        isLoading={isDashboardLoading || isYearlyLoading}
        onYearChange={setSelectedYear}
      />

      {/* Recent Transactions */}
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
      />

      {/* Quick Stats Footer */}
      {dashboardData && (
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
                className="!bg-white dark:!bg-slate-800 !border-2 !border-slate-200 dark:!border-slate-700 !rounded-xl !text-slate-900 dark:!text-slate-100 focus:!ring-2 focus:!ring-emerald-500/30 focus:!border-emerald-500 !shadow-sm"
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
              className="!bg-white dark:!bg-slate-800 !border-2 !border-slate-200 dark:!border-slate-700 !rounded-xl !text-slate-900 dark:!text-slate-100 focus:!ring-2 focus:!ring-rose-500/30 focus:!border-rose-500 !shadow-sm"
            />
          </div>
          
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

