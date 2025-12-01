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

// Simple Modal Component - Using CSS variables for theming
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
  
  const headerColors = {
    default: 'border-border',
    success: 'border-emerald-500/30',
    danger: 'border-rose-500/30'
  };
  
  const titleColors = {
    default: 'text-foreground',
    success: 'text-emerald-400',
    danger: 'text-rose-400'
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-border">
        <div className={`flex items-center justify-between p-4 border-b ${headerColors[variant]}`}>
          <h2 className={`text-xl font-semibold ${titleColors[variant]}`}>{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4">
          {children}
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
        <form onSubmit={handleCreateIncome} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Τίτλος *
            </label>
            <input
              type="text"
              value={incomeForm.title}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-success/50 focus:border-success transition-colors"
              placeholder="π.χ. Αμοιβή διαχείρισης Ιανουαρίου"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                <Euro className="w-4 h-4 inline mr-1" />
                Ποσό (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-success/50 focus:border-success transition-colors"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Ημερομηνία
              </label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-success/50 focus:border-success transition-colors"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                <Tag className="w-4 h-4 inline mr-1" />
                Κατηγορία
              </label>
              <GroupedCategorySelect
                value={incomeForm.category}
                onChange={(value) => setIncomeForm(prev => ({ ...prev, category: value }))}
                categories={incomeCategories}
                groupLabels={INCOME_GROUP_LABELS}
                placeholder="-- Επιλέξτε κατηγορία --"
                className="focus:ring-success/50 focus:border-success"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                Κτίριο
              </label>
              <select
                value={incomeForm.building}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, building: e.target.value }))}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-success/50 focus:border-success transition-colors"
              >
                <option value="">-- Επιλέξτε --</option>
                {buildings?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Περιγραφή</label>
            <textarea
              value={incomeForm.description}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-success/50 focus:border-success transition-colors"
              placeholder="Προαιρετική περιγραφή..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowIncomeModal(false)}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={createIncomeMutation.isPending}
              className="px-4 py-2 bg-success hover:bg-success/90 text-success-foreground rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {createIncomeMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Νέο Έξοδο" variant="danger">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Τίτλος *
            </label>
            <input
              type="text"
              value={expenseForm.title}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-destructive/50 focus:border-destructive transition-colors"
              placeholder="π.χ. Λογαριασμός ΔΕΗ"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                <Euro className="w-4 h-4 inline mr-1" />
                Ποσό (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-destructive/50 focus:border-destructive transition-colors"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Ημερομηνία
              </label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-destructive/50 focus:border-destructive transition-colors"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              <Tag className="w-4 h-4 inline mr-1" />
              Κατηγορία
            </label>
            <GroupedCategorySelect
              value={expenseForm.category}
              onChange={(value) => setExpenseForm(prev => ({ ...prev, category: value }))}
              categories={expenseCategories}
              groupLabels={EXPENSE_GROUP_LABELS}
              placeholder="-- Επιλέξτε κατηγορία --"
              className="focus:ring-destructive/50 focus:border-destructive"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Περιγραφή</label>
            <textarea
              value={expenseForm.description}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-destructive/50 focus:border-destructive transition-colors"
              placeholder="Προαιρετική περιγραφή..."
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_paid"
              checked={expenseForm.is_paid}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, is_paid: e.target.checked }))}
              className="w-4 h-4 rounded border-border bg-muted text-destructive focus:ring-destructive/50"
            />
            <label htmlFor="is_paid" className="text-sm text-muted-foreground">Έχει πληρωθεί</label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowExpenseModal(false)}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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

