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
  useInitializeCategories,
  useCreateExpense,
  useCreateIncome,
  useExpenseCategories,
  useIncomeCategories
} from '@/hooks/useOfficeFinance';
import { useBuildings } from '@/hooks/useBuildings';

// Simple Modal Component
function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
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
    } catch (error) {
      console.error('Failed to mark income as received:', error);
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
        <AlertCircle className="w-16 h-16 text-rose-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Σφάλμα φόρτωσης</h2>
        <p className="text-slate-400 mb-4">
          {error?.message || 'Δεν ήταν δυνατή η φόρτωση των οικονομικών στοιχείων'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-xl shadow-lg shadow-violet-500/20">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Οικονομικά Γραφείου</h1>
            <p className="text-slate-400">Διαχείριση εσόδων και εξόδων του γραφείου διαχείρισης</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleInitCategories}
            disabled={initCategoriesMutation.isPending}
            className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Αρχικοποίηση προεπιλεγμένων κατηγοριών"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Κατηγορίες</span>
          </button>
          
          <button
            onClick={() => refetch()}
            disabled={isDashboardLoading}
            className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isDashboardLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Ανανέωση</span>
          </button>
          
          <button 
            onClick={handleExport}
            className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Εξαγωγή</span>
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowIncomeModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Νέο Έσοδο</span>
            </button>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-rose-500/20"
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
        isLoading={isDashboardLoading}
        onMarkReceived={handleMarkReceived}
      />

      {/* Quick Stats Footer */}
      {dashboardData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {dashboardData.income_by_building?.length || 0}
            </p>
            <p className="text-sm text-slate-400">Κτίρια με έσοδα</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {dashboardData.expenses_by_category?.reduce((sum, c) => sum + c.count, 0) || 0}
            </p>
            <p className="text-sm text-slate-400">Έξοδα μήνα</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">
              {dashboardData.pending_incomes?.length || 0}
            </p>
            <p className="text-sm text-slate-400">Εκκρεμή έσοδα</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {dashboardData.yearly_summary?.monthly_data?.filter(m => m.net > 0).length || 0}/12
            </p>
            <p className="text-sm text-slate-400">Κερδοφόροι μήνες</p>
          </div>
        </div>
      )}

      {/* Income Modal */}
      <Modal isOpen={showIncomeModal} onClose={() => setShowIncomeModal(false)} title="Νέο Έσοδο">
        <form onSubmit={handleCreateIncome} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Τίτλος *
            </label>
            <input
              type="text"
              value={incomeForm.title}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="π.χ. Αμοιβή διαχείρισης Ιανουαρίου"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <Euro className="w-4 h-4 inline mr-1" />
                Ποσό (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Ημερομηνία
              </label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <Tag className="w-4 h-4 inline mr-1" />
                Κατηγορία
              </label>
              <select
                value={incomeForm.category}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">-- Επιλέξτε --</option>
                {incomeCategories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                Κτίριο
              </label>
              <select
                value={incomeForm.building}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, building: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">-- Επιλέξτε --</option>
                {buildings?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Περιγραφή</label>
            <textarea
              value={incomeForm.description}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Προαιρετική περιγραφή..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setShowIncomeModal(false)}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={createIncomeMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {createIncomeMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Νέο Έξοδο">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Τίτλος *
            </label>
            <input
              type="text"
              value={expenseForm.title}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="π.χ. Λογαριασμός ΔΕΗ"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <Euro className="w-4 h-4 inline mr-1" />
                Ποσό (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Ημερομηνία
              </label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              <Tag className="w-4 h-4 inline mr-1" />
              Κατηγορία
            </label>
            <select
              value={expenseForm.category}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value="">-- Επιλέξτε --</option>
              {expenseCategories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Περιγραφή</label>
            <textarea
              value={expenseForm.description}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Προαιρετική περιγραφή..."
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_paid"
              checked={expenseForm.is_paid}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, is_paid: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="is_paid" className="text-sm text-slate-300">Έχει πληρωθεί</label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setShowExpenseModal(false)}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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

