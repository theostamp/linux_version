'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenses } from '@/hooks/useExpenses';
import { useImprovedFinancialData } from '@/hooks/useImprovedFinancialData';
import { Expense, ExpenseCategory, DistributionType } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ExpenseViewModal } from './ExpenseViewModal';
import { Plus, Eye, Trash2, Calendar, Euro, Building, Wrench, PiggyBank, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ComprehensiveExpenseListProps {
  buildingId: number;
  buildingName?: string;
  onExpenseSelect?: (expense: Expense) => void;
  showActions?: boolean;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  onAddExpense?: () => void;
  ref?: React.Ref<{ refresh: () => void }>;
}

export const ComprehensiveExpenseList = React.forwardRef<{ refresh: () => void }, ComprehensiveExpenseListProps>(({ 
  buildingId,
  buildingName,
  onExpenseSelect,
  showActions = true,
  selectedMonth,
  onMonthChange,
  onAddExpense,
}, ref) => {
  const { expenses, isLoading, error, loadExpenses, deleteExpense } = useExpenses(buildingId, selectedMonth);
  const { data: financialData, isLoading: financialLoading, refetch: refetchFinancial } = useImprovedFinancialData({
    buildingId,
    selectedMonth
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Generate month options for the last 24 months
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('el-GR', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      options.push({ value, label });
    }
    
    return options;
  };

  // Expose refresh function through ref
  React.useImperativeHandle(ref, () => ({
    refresh: () => {
      loadExpenses();
      refetchFinancial();
    }
  }));

  // Handle expense deletion
  const handleDeleteExpense = async (expense: Expense, e: React.MouseEvent) => {
    e.stopPropagation();

    // Έλεγχος αν η δαπάνη συνδέεται με έργο
    const isProjectRelated = (
      // Δαπάνες με δόσεις/διακανονισμούς
      (expense.has_installments && expense.linked_maintenance_projects && expense.linked_maintenance_projects.length > 0) ||
      // Δαπάνες που συνδέονται με προγραμματισμένα έργα
      (expense.linked_maintenance_projects && expense.linked_maintenance_projects.length > 0)
    );

    if (isProjectRelated) {
      const project = expense.linked_maintenance_projects?.[0];
      const projectInfo = project ? ` με έργο "${project.title}"` : '';

      // Δημιουργία custom dialog για ενημέρωση
      const messageDiv = document.createElement('div');
      messageDiv.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h3 style="color: #dc2626; margin-bottom: 10px;">⚠️ Προσοχή</h3>
          <p style="margin-bottom: 15px;">
            Η δαπάνη <strong>"${expense.title}"</strong> ${projectInfo ? `συνδέεται με το έργο <strong>"${project?.title || 'Άγνωστο'}"</strong> και` : 'προέρχεται από προγραμματισμένο έργο και'}
            η διαγραφή της μπορεί να γίνει μόνο από τη σελίδα <strong>"Προγραμματισμένα Έργα"</strong>.
          </p>
          <p style="margin-bottom: 20px; color: #666;">
            Αυτό διασφαλίζει ότι δεν θα υπάρξουν ορφανές εγγραφές και διατηρείται η ακεραιότητα των δεδομένων.
          </p>
          <p style="margin-bottom: 0;">
            Θα μεταφερθείτε στη σελίδα διαχείρισης των προγραμματισμένων έργων.
          </p>
        </div>
      `;

      // Χρήση toast με HTML content και μεγαλύτερη διάρκεια
      toast.error(
        <div dangerouslySetInnerHTML={{ __html: messageDiv.innerHTML }} />,
        {
          duration: 5000,
          action: {
            label: 'Μετάβαση',
            onClick: () => {
              // Redirect στη σελίδα προγραμματισμένων έργων
              if (project?.id) {
                // Αν έχουμε το ID του έργου, πάμε απευθείας στη σελίδα επεξεργασίας
                window.location.href = `/maintenance/scheduled/${project.id}/edit`;
              } else {
                // Αλλιώς πάμε στη γενική σελίδα προγραμματισμένων έργων
                window.location.href = '/maintenance/scheduled';
              }
            }
          }
        }
      );

      // Αυτόματη μετάβαση μετά από 5 δευτερόλεπτα αν ο χρήστης δεν πατήσει το κουμπί
      setTimeout(() => {
        if (project?.id) {
          window.location.href = `/maintenance/scheduled/${project.id}/edit`;
        } else {
          window.location.href = '/maintenance/scheduled';
        }
      }, 5000);

      return;
    }

    // Για απλές δαπάνες χωρίς συνδέσεις με έργα
    if (window.confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε τη δαπάνη "${expense.title}";`)) {
      try {
        const success = await deleteExpense(expense.id);
        if (success) {
          toast.success(`Η δαπάνη "${expense.title}" διαγράφηκε επιτυχώς!`);
        } else {
          toast.error('Σφάλμα κατά τη διαγραφή της δαπάνης');
        }
      } catch (error) {
        toast.error('Σφάλμα κατά τη διαγραφή της δαπάνης');
      }
    }
  };

  // Handle expense view
  const handleViewExpense = (expense: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  // Handle modal close
  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedExpense(null);
  };

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];

    return expenses.filter((expense) => {
      const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (expense.category_display || expense.category).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'electricity_common': 'bg-blue-100 text-blue-800',
      'water_common': 'bg-cyan-100 text-cyan-800',
      'heating_fuel': 'bg-orange-100 text-orange-800',
      'heating_gas': 'bg-orange-100 text-orange-800',
      'cleaning': 'bg-green-100 text-green-800',
      'building_maintenance': 'bg-purple-100 text-purple-800',
      'building_insurance': 'bg-red-100 text-red-800',
      'management_fees': 'bg-indigo-100 text-indigo-800',
      'miscellaneous': 'bg-gray-100 text-gray-800',
      'reserve_fund': 'bg-yellow-100 text-yellow-800',
      'previous_obligations': 'bg-red-100 text-red-800',
      'scheduled_maintenance': 'bg-orange-100 text-orange-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getDistributionBadge = (distributionType: DistributionType) => {
    const badges: Record<DistributionType, string> = {
      'by_participation_mills': '📊 Ανά Μίλια Συμμετοχής',
      'equal_share': '⚖️ Ισότιμη Κατανομή',
      'specific_apartments': '🎯 Συγκεκριμένα Διαμερίσματα',
      'by_meters': '📏 Ανά Τετραγωνικά',
    };
    return badges[distributionType] || '📊 Άγνωστη Κατανομή';
  };

  // Create comprehensive expense items
  const comprehensiveExpenses = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      amount: number;
      date: string;
      category: string;
      category_display: string;
      type: 'expense' | 'previous_obligations' | 'reserve_fund' | 'scheduled_maintenance';
      description?: string;
      isVirtual?: boolean;
    }> = [];

    // Add regular expenses
    filteredExpenses.forEach(expense => {
      items.push({
        id: `expense-${expense.id}`,
        title: expense.title,
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        category_display: expense.category_display || expense.category,
        type: 'expense',
        description: (expense as any).description || '',
        isVirtual: false
      });
    });

    // Add previous obligations if available
    if ((financialData as any)?.previous_obligations && (financialData as any).previous_obligations > 0) {
      items.push({
        id: 'previous-obligations',
        title: 'Παλαιότερες Οφειλές',
        amount: (financialData as any).previous_obligations,
        date: selectedMonth || new Date().toISOString().slice(0, 7),
        category: 'previous_obligations',
        category_display: 'Παλαιότερες Οφειλές',
        type: 'previous_obligations',
        description: 'Οφειλές από προηγούμενους μήνες που μεταφέρονται',
        isVirtual: true
      });
    }

    // Add management fees if available
    if (financialData?.monthly_invoice?.current_month_charges?.management_fees && 
        financialData.monthly_invoice.current_month_charges.management_fees > 0) {
      items.push({
        id: 'management-fees',
        title: 'Διαχειριστικά Έξοδα',
        amount: financialData.monthly_invoice.current_month_charges.management_fees,
        date: selectedMonth || new Date().toISOString().slice(0, 7),
        category: 'management_fees',
        category_display: 'Διαχειριστικά Έξοδα',
        type: 'expense' as any,
        description: 'Μηνιαία αμοιβή διαχείρισης κτιρίου',
        isVirtual: true
      });
    }

    // Add reserve fund contribution if available
    if (financialData?.monthly_invoice?.current_month_charges?.reserve_fund_contribution && 
        financialData.monthly_invoice.current_month_charges.reserve_fund_contribution > 0) {
      items.push({
        id: 'reserve-fund',
        title: 'Εισφορά Αποθεματικού',
        amount: financialData.monthly_invoice.current_month_charges.reserve_fund_contribution,
        date: selectedMonth || new Date().toISOString().slice(0, 7),
        category: 'reserve_fund',
        category_display: 'Εισφορά Αποθεματικού',
        type: 'reserve_fund',
        description: 'Μηνιαία εισφορά για το ταμείο αποθεματικού',
        isVirtual: true
      });
    }

    // Add scheduled maintenance installments if available
    if ((financialData as any)?.scheduled_maintenance_installments && 
        (financialData as any).scheduled_maintenance_installments.count > 0) {
      (financialData as any).scheduled_maintenance_installments.installments.forEach((installment: any, index: number) => {
        items.push({
          id: `scheduled-${installment.id}`,
          title: `${installment.title} - Δόση ${installment.installment_number}`,
          amount: installment.amount,
          date: installment.due_date,
          category: 'scheduled_maintenance',
          category_display: 'Προγραμματισμένα Έργα',
          type: 'scheduled_maintenance',
          description: `Δόση ${installment.installment_number} - ${installment.installment_type}`,
          isVirtual: true
        });
      });
    }

    return items;
  }, [filteredExpenses, financialData, selectedMonth]);

  if (isLoading || financialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Ολοκληρωμένες Δαπάνες
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Φόρτωση δεδομένων...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Σφάλμα Φόρτωσης
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Ολοκληρωμένες Δαπάνες
            {buildingName && (
              <Badge variant="outline" className="ml-2">
                {buildingName}
              </Badge>
            )}
          </CardTitle>
          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                onClick={onAddExpense}
                className="gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Νέα Δαπάνη
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Enhanced Filters */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">🔍 Φίλτρα Αναζήτησης</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
                className="text-xs"
              >
                🗑️ Καθαρισμός Φίλτρων
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Αναζήτηση</label>
                <Input
                  placeholder="🔍 Αναζήτηση δαπάνης..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">📅 Μήνας</label>
                <div className="flex gap-2">
                  <Select 
                    value={selectedMonth || ''} 
                    onValueChange={(value) => onMonthChange?.(value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Επιλέξτε μήνα" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateMonthOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                      onMonthChange?.(currentMonth);
                    }}
                    className="text-xs px-2"
                    title="Τρέχων μήνας"
                  >
                    📅
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Κατηγορία</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Επιλέξτε κατηγορία" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📂 Όλες οι κατηγορίες</SelectItem>
                    <SelectItem value="electricity_common">⚡ Ηλεκτρισμός Κοινοχρήστων</SelectItem>
                    <SelectItem value="water_common">💧 Νερό Κοινοχρήστων</SelectItem>
                    <SelectItem value="heating_fuel">🔥 Θέρμανση (Πετρέλαιο)</SelectItem>
                    <SelectItem value="heating_gas">🔥 Θέρμανση (Φυσικό Αέριο)</SelectItem>
                    <SelectItem value="cleaning">🧹 Καθαρισμός</SelectItem>
                    <SelectItem value="building_maintenance">🔧 Συντήρηση Κτιρίου</SelectItem>
                    <SelectItem value="building_insurance">🛡️ Ασφάλεια Κτιρίου</SelectItem>
                    <SelectItem value="management_fees">📋 Διαχειριστικά Έξοδα</SelectItem>
                    <SelectItem value="miscellaneous">📦 Διάφορες Δαπάνες</SelectItem>
                    <SelectItem value="previous_obligations">📊 Παλαιότερες Οφειλές</SelectItem>
                    <SelectItem value="reserve_fund">💰 Εισφορά Αποθεματικού</SelectItem>
                    <SelectItem value="scheduled_maintenance">🔧 Προγραμματισμένα Έργα</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Comprehensive Expenses List */}
          <div className="space-y-4">
            {comprehensiveExpenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Δεν υπάρχουν δαπάνες
                </h3>
                <p className="text-gray-500 mb-4">
                  Δεν έχουν καταχωρηθεί δαπάνες ακόμα. Ξεκινήστε προσθέτοντας την πρώτη δαπάνη.
                </p>
                {showActions && (
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={onAddExpense}
                  >
                    ➕ Προσθήκη Πρώτης Δαπάνης
                  </Button>
                )}
              </div>
            ) : (
              comprehensiveExpenses.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                    item.isVirtual ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${getCategoryColor(item.category)} text-xs`}>
                            {item.category_display}
                          </Badge>
                          {item.isVirtual ? (
                            <Badge variant="outline" className="text-blue-600 text-xs">
                              📊 Υπολογισμένη
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 text-xs">
                              📋 Καταχωρημένη
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Key Information Row */}
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Euro className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600 text-base">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{formatDate(item.date)}</span>
                        </div>
                        {item.type === 'expense' && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">📊</span>
                            <span>{getDistributionBadge((item as any).distribution_type || 'by_participation_mills')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {showActions && !item.isVirtual && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleViewExpense(item as any, e)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Προβολή λεπτομερειών"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteExpense(item as any, e)}
                          className="text-red-600 hover:text-red-700"
                          title="Διαγραφή δαπάνης"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {comprehensiveExpenses.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Σύνολο Δαπανών:</span>
                <span className="font-bold text-lg text-green-600">
                  {formatCurrency(comprehensiveExpenses.reduce((sum, item) => sum + item.amount, 0))}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {comprehensiveExpenses.filter(item => !item.isVirtual).length} καταχωρημένες δαπάνες,{' '}
                {comprehensiveExpenses.filter(item => item.isVirtual).length} υπολογισμένες δαπάνες
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense View Modal */}
      {selectedExpense && (
        <ExpenseViewModal
          expense={selectedExpense}
          isOpen={showViewModal}
          onClose={handleCloseViewModal}
        />
      )}
    </>
  );
});

ComprehensiveExpenseList.displayName = 'ComprehensiveExpenseList';
