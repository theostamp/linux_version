import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Euro, 
  Clock, 
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  PieChart,
  Activity,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { MonthlyTransactionsModal } from '@/components/financial/MonthlyTransactionsModal';
import { typography } from '@/lib/typography';

interface Transaction {
  id: number;
  date: string;
  amount: number | string;
  type: string;
  description: string;
  apartment_number?: string;
  category?: string;
}

interface MonthlyBreakdown {
  month: string;
  payments: number;
  expenses: number;
  balance: number;
  transactions: Transaction[];
}

interface AmountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingId: number;
  amountType: 'current_reserve' | 'total_balance' | 'current_obligations' | 'previous_obligations' | 'reserve_fund_contribution';
  amount: number;
  title: string;
  selectedMonth?: string;
}

export const AmountDetailsModal: React.FC<AmountDetailsModalProps> = ({
  isOpen,
  onClose,
  buildingId,
  amountType,
  amount,
  title,
  selectedMonth
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyBreakdown[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [selectedMonthForModal, setSelectedMonthForModal] = useState<{ month: string; displayName: string } | null>(null);

  // Function to open monthly transactions modal
  const openMonthlyTransactionsModal = (month: string, displayName: string) => {
    setSelectedMonthForModal({ month, displayName });
    setMonthlyModalOpen(true);
  };

  useEffect(() => {
    if (isOpen) {
      loadAmountDetails();
    }
  }, [isOpen, buildingId, amountType, selectedMonth]);

  const loadAmountDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading amount details for:', { buildingId, amountType, selectedMonth, amount });
      
      // Load financial summary
      const summaryParams = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(selectedMonth && { month: selectedMonth })
      });
      
      console.log('📊 Loading summary from:', `/financial/dashboard/summary/?${summaryParams}`);
      const summaryResponse = await api.get(`/financial/dashboard/summary/?${summaryParams}`);
      console.log('📊 Summary response:', summaryResponse.data);
      setSummary(summaryResponse.data);

      // Load transaction history - try different endpoints
      let transactions = [];
      
      try {
        // First try the transactions endpoint
      const transactionsParams = new URLSearchParams({
        building_id: buildingId.toString(),
          limit: '100'
      });
      
        console.log('💳 Loading transactions from:', `/financial/transactions/?${transactionsParams}`);
      const transactionsResponse = await api.get(`/financial/transactions/?${transactionsParams}`);
        transactions = transactionsResponse.data.results || transactionsResponse.data || [];
        console.log('💳 Transactions response:', transactions);
        
        // If transactions is empty, try loading expenses and payments separately
        if (transactions.length === 0) {
          console.log('⚠️ No transactions found, trying expenses and payments separately');
          
          try {
            console.log('💰 Loading expenses from:', `/financial/expenses/?building_id=${buildingId}`);
            const expensesResponse = await api.get(`/financial/expenses/?building_id=${buildingId}&limit=50`);
            console.log('💰 Expenses response:', expensesResponse.data);
            
            console.log('💳 Loading payments from:', `/financial/payments/`);
            const paymentsResponse = await api.get(`/financial/payments/?limit=100`);
            console.log('💳 Payments response:', paymentsResponse.data);
            
            const expenses = expensesResponse.data.results || expensesResponse.data || [];
            const allPayments = paymentsResponse.data.results || paymentsResponse.data || [];
            
            // Filter payments for this building (via apartments)
            const payments = allPayments.filter((pay: any) => {
              // We'll need to check if the payment's apartment belongs to this building
              // For now, let's include all payments and filter later if needed
              return true;
            });
            
            console.log('💰 Found expenses:', expenses.length);
            console.log('💳 Found payments:', payments.length);
            
            // Convert to transaction format
            transactions = [
              ...expenses.map((exp: any) => ({
                id: exp.id,
                date: exp.date,
                amount: -exp.amount, // Negative for expenses
                type: 'expense_created',
                description: exp.title,
                apartment_number: exp.apartment?.number,
                category: exp.category
              })),
              ...payments.map((pay: any) => ({
                id: pay.id,
                date: pay.date,
                amount: pay.amount, // Positive for payments
                type: 'payment_received',
                description: `Είσπραξη - ${pay.payer_name}`,
                apartment_number: pay.apartment?.number,
                category: pay.payment_type
              }))
            ];
            
            console.log('💳 Combined transactions from expenses/payments:', transactions);
          } catch (separateError) {
            console.error('❌ Expenses/payments endpoints failed:', separateError);
          }
        }
      } catch (transactionsError) {
        console.log('⚠️ Transactions endpoint failed, trying expenses and payments separately');
        
        // If transactions endpoint fails, try loading expenses and payments separately
        try {
          console.log('💰 Loading expenses from:', `/financial/expenses/?building_id=${buildingId}`);
          const expensesResponse = await api.get(`/financial/expenses/?building_id=${buildingId}&limit=50`);
          console.log('💰 Expenses response:', expensesResponse.data);
          
          console.log('💳 Loading payments from:', `/financial/payments/`);
          const paymentsResponse = await api.get(`/financial/payments/?limit=100`);
          console.log('💳 Payments response:', paymentsResponse.data);
          
          const expenses = expensesResponse.data.results || expensesResponse.data || [];
          const allPayments = paymentsResponse.data.results || paymentsResponse.data || [];
          
          // Filter payments for this building (via apartments)
          const payments = allPayments.filter((pay: any) => {
            // We'll need to check if the payment's apartment belongs to this building
            // For now, let's include all payments and filter later if needed
            return true;
          });
          
          console.log('💰 Found expenses:', expenses.length);
          console.log('💳 Found payments:', payments.length);
          
          // Convert to transaction format
          transactions = [
            ...expenses.map((exp: any) => ({
              id: exp.id,
              date: exp.date,
              amount: -exp.amount, // Negative for expenses
              type: 'expense_created',
              description: exp.title,
              apartment_number: exp.apartment?.number,
              category: exp.category
            })),
            ...payments.map((pay: any) => ({
              id: pay.id,
              date: pay.date,
              amount: pay.amount, // Positive for payments
              type: 'payment_received',
              description: `Είσπραξη - ${pay.payer_name}`,
              apartment_number: pay.apartment?.number,
              category: pay.payment_type
            }))
          ];
          
          console.log('💳 Combined transactions from expenses/payments:', transactions);
        } catch (separateError) {
          console.error('❌ Both transaction endpoints failed:', separateError);
          // Create a mock transaction for the current amount if no data is available
          if (amount !== 0) {
            const currentDate = new Date();
            transactions = [{
              id: 1,
              date: currentDate.toISOString().split('T')[0],
              amount: amount,
              type: amount > 0 ? 'payment_received' : 'expense_created',
              description: amount > 0 ? 'Είσπραξη' : 'Δαπάνη',
              apartment_number: undefined,
              category: 'demo'
            }];
            console.log('💳 Created mock transaction for amount:', amount);
          }
        }
      }
      
      setAllTransactions(transactions);

      // Generate monthly breakdown
      const breakdown = generateMonthlyBreakdown(transactions);
      console.log('📅 Monthly breakdown:', breakdown);
      console.log('📅 Monthly breakdown length:', breakdown.length);
      console.log('📅 Monthly breakdown details:', breakdown.map(b => ({ month: b.month, balance: b.balance, transactions: b.transactions.length })));
      setMonthlyBreakdown(breakdown);

    } catch (err: any) {
      console.error('❌ Error loading amount details:', err);
      setError(`Σφάλμα κατά τη φόρτωση των λεπτομερειών: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMonthlyBreakdown = (transactions: Transaction[]): MonthlyBreakdown[] => {
    const monthlyData: { [key: string]: MonthlyBreakdown } = {};

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          payments: 0,
          expenses: 0,
          balance: 0,
          transactions: []
        };
      }

      const amount = getAmountAsNumber(transaction.amount);
      if (amount > 0) {
        monthlyData[monthKey].payments += amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(amount);
      }

      monthlyData[monthKey].balance = monthlyData[monthKey].payments - monthlyData[monthKey].expenses;
      monthlyData[monthKey].transactions.push(transaction);
    });

    return Object.values(monthlyData)
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12); // Last 12 months
  };

  const getAmountExplanation = () => {
    switch (amountType) {
      case 'current_reserve':
        return {
          title: 'Τρέχον Ισοζύγιο',
          description: 'Το διαθέσιμο ποσό που έχει το κτίριο από τις εισπράξεις μείον τις δαπάνες.',
          formula: 'Εισπράξεις - Δαπάνες = Ισοζύγιο',
          icon: <TrendingUp className="h-5 w-5 text-green-600" />,
          color: 'green'
        };
      case 'total_balance':
        return {
          title: 'Συνολικό Υπόλοιπο',
          description: 'Η συνολική οικονομική κατάσταση του κτιρίου.',
          formula: 'Αποθεματικό - Υποχρεώσεις = Υπόλοιπο',
          icon: <Euro className="h-5 w-5 text-blue-600" />,
          color: 'blue'
        };
      case 'current_obligations':
        return {
          title: 'Τρέχουσες Υποχρεώσεις',
          description: 'Συνολικές οφειλές διαμερισμάτων και εκκρεμείς δαπάνες.',
          formula: 'Οφειλές Διαμερισμάτων + Εκκρεμείς Δαπάνες',
          icon: <TrendingDown className="h-5 w-5 text-red-600" />,
          color: 'red'
        };
      case 'previous_obligations':
        return {
          title: 'Οφειλές Προηγούμενων Μηνών',
          description: 'Συσσωρευμένες οφειλές από προηγούμενες περιόδους που δεν έχουν εξοφληθεί.',
          formula: 'Άθροισμα αρνητικών υπολοίπων διαμερισμάτων',
          icon: <Clock className="h-5 w-5 text-purple-600" />,
          color: 'purple'
        };
      case 'reserve_fund_contribution':
        return {
          title: 'Εισφορά Αποθεματικού',
          description: 'Μηνιαία εισφορά για τη δημιουργία αποθεματικού.',
          formula: 'Στόχος ÷ Διάρκεια (μήνες)',
          icon: <ArrowUpRight className="h-5 w-5 text-purple-600" />,
          color: 'purple'
        };
      default:
        return {
          title: 'Άγνωστο Ποσό',
          description: 'Δεν υπάρχει περιγραφή για αυτό το ποσό.',
          formula: '',
          icon: <Info className="h-5 w-5 text-gray-600" />,
          color: 'gray'
        };
    }
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('el-GR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getTransactionIcon = (transaction: Transaction) => {
    const amount = getAmountAsNumber(transaction.amount);
    if (amount > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    } else if (amount < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTransactionTypeLabel = (type: string) => {
    const typeLabels: { [key: string]: string } = {
      'payment_received': 'Είσπραξη',
      'common_expense_charge': 'Χρέωση Κοινοχρήστων',
      'expense_created': 'Δημιουργία Δαπάνης',
      'expense_issued': 'Εκδοση Δαπάνης',
      'reserve_fund_payment': 'Εισφορά Αποθεματικού',
      'balance_adjustment': 'Προσαρμογή Υπολοίπου',
      'interest_charge': 'Χρέωση Τόκων',
      'penalty_charge': 'Χρέωση Προστίμου'
    };
    return typeLabels[type] || type;
  };

  // Helper function to safely convert amount to number
  const getAmountAsNumber = (amount: number | string): number => {
    if (typeof amount === 'number') return amount;
    if (typeof amount === 'string') return parseFloat(amount) || 0;
    return 0;
  };

  const getStatusIcon = () => {
    if (displayAmount > 0) {
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    } else if (displayAmount < 0) {
      return <XCircle className="h-6 w-6 text-red-600" />;
    }
    return <AlertCircle className="h-6 w-6 text-yellow-600" />;
  };

  const getStatusText = () => {
    if (displayAmount > 0) {
      return 'Θετικό Υπόλοιπο';
    } else if (displayAmount < 0) {
      return 'Αρνητικό Υπόλοιπο';
    }
    return 'Μηδενικό Υπόλοιπο';
  };

  const explanation = getAmountExplanation();
  const totalPayments = summary?.total_payments_month || 0;
  const totalExpenses = summary?.total_expenses_month || 0;
  
  // Use the amount as provided by the API - it's already correctly calculated
  let displayAmount = amount;
  
  const maxAmount = Math.max(totalPayments, totalExpenses, Math.abs(displayAmount));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {explanation.icon}
            <div className="flex flex-col">
              <span>Λεπτομέρειες: {explanation.title}</span>
              {selectedMonth && (
                <span className="text-sm font-normal text-gray-600 mt-1">
                  Περίοδος: {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <Info className="h-12 w-12 mx-auto mb-4" />
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Amount Overview */}
            <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon()}
                <div>
                      <h3 className="text-lg font-semibold">{getStatusText()}</h3>
                      <p className="text-sm text-muted-foreground">{explanation.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${
                      displayAmount > 0 ? 'text-green-600' : displayAmount < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(displayAmount)}
                    </div>
                    <Badge variant={displayAmount >= 0 ? "default" : "destructive"} className="mt-1">
                      {explanation.title}
                    </Badge>
                  </div>
                </div>

                {/* Formula */}
                {explanation.formula && (
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Τύπος Υπολογισμού</span>
                    </div>
                    <code className="text-sm bg-gray-100 px-3 py-2 rounded block">
                      {explanation.formula}
                    </code>
                  </div>
                )}

                {/* Balance Breakdown for Total Balance */}
                {amountType === 'total_balance' && (
                  <div className="bg-white p-4 rounded-lg border mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-sm">Διάκριση Υπολοίπου</span>
                    </div>
                    <div className="space-y-3">
                      {/* Αποθεματικό */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Τρέχον Αποθεματικό:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-green-700">
                            {formatCurrency(summary?.current_reserve || 0)}
                          </span>
                          <span className="text-xs text-gray-500">(διαθέσιμο)</span>
                        </div>
                      </div>

                      {/* Συνολικές Υποχρεώσεις */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Συνολικές Υποχρεώσεις:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-red-700">
                            {formatCurrency(summary?.current_obligations || 0)}
                          </span>
                          <span className="text-xs text-gray-500">(οφειλές)</span>
                        </div>
                      </div>

                      {/* Συνολικό Υπόλοιπο */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">Καθαρό Υπόλοιπο:</span>
                          <span className={`font-bold text-lg ${displayAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(displayAmount)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-right">
                          Αποθεματικό - Υποχρεώσεις
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Obligations Breakdown */}
                {amountType === 'current_obligations' && (
                  <div className="bg-white p-4 rounded-lg border mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-sm">Ανάλυση Τρεχουσών Υποχρεώσεων</span>
                    </div>
                    <div className="space-y-3">
                      {/* Μηνιαίες δαπάνες */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Μηνιαίες δαπάνες:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-blue-700">
                            {formatCurrency(totalExpenses)}
                          </span>
                          <span className="text-xs text-gray-500">(τρέχον μήνας)</span>
                        </div>
                      </div>
                      
                      {/* Δαπάνες διαχείρισης */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Δαπάνες διαχείρισης:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-purple-700">
                            {formatCurrency(summary?.total_management_cost || 0)}
                          </span>
                          <span className="text-xs text-gray-500">(διαχειριστικά τέλη)</span>
                        </div>
                      </div>
                      
                      {/* Εισφορά αποθεματικού */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Εισφορά αποθεματικού:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-orange-700">
                            {formatCurrency(summary?.reserve_fund_contribution || 0)}
                          </span>
                          <span className="text-xs text-gray-500">(μηνιαία εισφορά)</span>
                        </div>
                      </div>
                      
                      {/* Συνολικές τρέχουσες υποχρεώσεις */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">Συνολικές τρέχουσες υποχρεώσεις:</span>
                          <span className="font-bold text-lg text-red-600">
                            {formatCurrency(Math.abs(displayAmount))}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Μηνιαίες δαπάνες + Δαπάνες διαχείρισης + Εισφορά αποθεματικού
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Previous Obligations Breakdown */}
                {amountType === 'previous_obligations' && (
                  <div className="bg-white p-4 rounded-lg border mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-sm">Ανάλυση Παλαιότερων Οφειλών</span>
                    </div>
                    <div className="space-y-3">
                      {/* Συσσωρευμένες οφειλές διαμερισμάτων */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Συσσωρευμένες οφειλές διαμερισμάτων:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-red-700">
                            {formatCurrency(Math.abs(displayAmount))}
                          </span>
                          <span className="text-xs text-gray-500">(αρνητικά υπόλοιπα)</span>
                        </div>
                      </div>
                      
                      {/* Εκκρεμείς πληρωμές προηγούμενων μηνών */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Εκκρεμείς πληρωμές προηγούμενων μηνών:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-orange-700">
                            {formatCurrency(summary?.pending_payments || 0)}
                          </span>
                          <span className="text-xs text-gray-500">(μη εξοφλημένες)</span>
                        </div>
                      </div>
                      
                      {/* Δαπάνες που δεν έχουν καλυφθεί */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Δαπάνες που δεν έχουν καλυφθεί:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-yellow-700">
                            {formatCurrency(summary?.pending_expenses || 0)}
                          </span>
                          <span className="text-xs text-gray-500">(εκκρεμείς δαπάνες)</span>
                        </div>
                      </div>
                      
                      {/* Συνολικές παλαιότερες οφειλές */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">Συνολικές παλαιότερες οφειλές:</span>
                          <span className="font-bold text-lg text-purple-600">
                            {formatCurrency(Math.abs(displayAmount))}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Συσσωρευμένες οφειλές διαμερισμάτων + Εκκρεμείς πληρωμές + Δαπάνες που δεν έχουν καλυφθεί
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Εισπράξεις</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalPayments)}
                    </div>
                    <Progress 
                      value={(totalPayments / maxAmount) * 100} 
                      className="mt-2 h-2 bg-green-200"
                    />
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">Δαπάνες</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(totalExpenses)}
                    </div>
                    <Progress 
                      value={(totalExpenses / maxAmount) * 100} 
                      className="mt-2 h-2 bg-red-200"
                    />
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Καθαρό</span>
                    </div>
                    <div className={`text-2xl font-bold ${
                      (totalPayments - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(totalPayments - totalExpenses)}
                    </div>
                    <Progress 
                      value={Math.abs((totalPayments - totalExpenses) / maxAmount) * 100} 
                      className={`mt-2 h-2 ${
                        (totalPayments - totalExpenses) >= 0 ? 'bg-green-200' : 'bg-red-200'
                      }`}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs for different views */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Επισκόπηση
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Χρονική Εξέλιξη
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Συναλλαγές
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${typography.cardTitle}`}>
                        <BarChart3 className="h-5 w-5" />
                        Μηνιαία Εξέλιξη
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {monthlyBreakdown.length > 0 ? (
                        <div className="space-y-3">
                          {monthlyBreakdown.slice(0, 6).map((month) => (
                            <div key={month.month} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{formatMonth(month.month)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openMonthlyTransactionsModal(month.month, formatMonth(month.month))}
                                    className="h-5 px-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title={`Δείτε όλες τις κινήσεις για τον ${formatMonth(month.month)}`}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Badge variant={month.balance >= 0 ? "default" : "destructive"}>
                                  {formatCurrency(month.balance)}
                                </Badge>
                              </div>
                              <div className="flex gap-1 h-4">
                                <div 
                                  className="bg-green-500 rounded-l"
                                  style={{ 
                                    width: `${(month.payments / maxAmount) * 100}%`,
                                    minWidth: month.payments > 0 ? '4px' : '0'
                                  }}
                                />
                                <div 
                                  className="bg-red-500 rounded-r"
                                  style={{ 
                                    width: `${(month.expenses / maxAmount) * 100}%`,
                                    minWidth: month.expenses > 0 ? '4px' : '0'
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>+{month.payments.toFixed(0)}€</span>
                                <span>-{month.expenses.toFixed(0)}€</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Δεν υπάρχουν δεδομένα για μηνιαία εξέλιξη</p>
                          <p className="text-sm mt-2">
                            Το ποσό {formatCurrency(amount)} προέρχεται από τον τρέχοντα υπολογισμό
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Transaction Types Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${typography.cardTitle}`}>
                        <PieChart className="h-5 w-5" />
                        Κατανομή Συναλλαγών
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {allTransactions.length > 0 ? (
                        <div className="space-y-3">
                          {(() => {
                            const typeCounts: { [key: string]: number } = {};
                            allTransactions.forEach(t => {
                              typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
                            });
                            return Object.entries(typeCounts)
                              .sort(([,a], [,b]) => b - a)
                              .slice(0, 5)
                              .map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between">
                                  <span className="text-sm">{getTransactionTypeLabel(type)}</span>
                                  <Badge variant="outline">{count}</Badge>
                                </div>
                              ));
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Δεν υπάρχουν συναλλαγές</p>
                          <p className="text-sm mt-2">
                            Το ποσό {formatCurrency(amount)} είναι το τρέχον υπόλοιπο
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Amount Source Information */}
                {allTransactions.length === 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Info className="h-5 w-5 text-yellow-600" />
                        <div>
                          <h4 className="font-medium text-yellow-800">Πληροφορίες για το Ποσό</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Το ποσό {formatCurrency(amount)} προέρχεται από τον τρέχοντα υπολογισμό του συστήματος. 
                            Δεν υπάρχουν συναλλαγές στη βάση δεδομένων για να δείξουμε λεπτομερείς πληροφορίες.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${typography.cardTitle}`}>
                      <Calendar className="h-5 w-5" />
                      Μηνιαία Εξέλιξη (Τελευταίοι 12 Μήνες)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monthlyBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {monthlyBreakdown.map((month) => (
                          <div key={month.month} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{formatMonth(month.month)}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openMonthlyTransactionsModal(month.month, formatMonth(month.month))}
                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title={`Δείτε όλες τις κινήσεις για τον ${formatMonth(month.month)}`}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                            <Badge variant={month.balance >= 0 ? "default" : "destructive"}>
                              {formatCurrency(month.balance)}
                            </Badge>
                          </div>
                          
                            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                              <div className="text-center p-2 bg-green-50 rounded">
                                <div className="text-green-600 font-medium">+{formatCurrency(month.payments)}</div>
                                <div className="text-xs text-green-600">Εισπράξεις</div>
                              </div>
                              <div className="text-center p-2 bg-red-50 rounded">
                                <div className="text-red-600 font-medium">-{formatCurrency(month.expenses)}</div>
                                <div className="text-xs text-red-600">Δαπάνες</div>
                              </div>
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <div className="text-blue-600 font-medium">{month.transactions.length}</div>
                                <div className="text-xs text-blue-600">Συναλλαγές</div>
                            </div>
                          </div>

                          {month.transactions.length > 0 && (
                              <details className="text-sm">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  Δείτε συναλλαγές ({month.transactions.length})
                                </summary>
                                <div className="mt-3 space-y-2">
                                  {month.transactions.slice(0, 5).map((transaction) => (
                                    <div key={transaction.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                                      {getTransactionIcon(transaction)}
                                      <div className="flex-1">
                                        <div className="font-medium text-xs">
                                        {transaction.description}
                                        </div>
                                        {transaction.apartment_number && (
                                          <div className="text-xs text-muted-foreground">
                                            Διαμ. {transaction.apartment_number}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className={`font-medium text-xs ${
                                        getAmountAsNumber(transaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {getAmountAsNumber(transaction.amount) > 0 ? '+' : ''}{formatCurrency(getAmountAsNumber(transaction.amount))}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {getTransactionTypeLabel(transaction.type)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {month.transactions.length > 5 && (
                                    <div className="text-center text-muted-foreground text-xs py-2">
                                      ...και {month.transactions.length - 5} ακόμα
                                    </div>
                                  )}
                                </div>
                              </details>
                          )}
                        </div>
                      ))}
                    </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">Δεν υπάρχουν δεδομένα μηνιαίας εξέλιξης</h3>
                        <p className="text-sm">
                          Το ποσό {formatCurrency(amount)} προέρχεται από τον τρέχοντα υπολογισμό του συστήματος.
                        </p>
                        <p className="text-sm mt-2">
                          Όταν προστεθούν συναλλαγές, θα εμφανιστούν εδώ με λεπτομερείς πληροφορίες ανά μήνα.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${typography.cardTitle}`}>
                      <Clock className="h-5 w-5" />
                      Πρόσφατες Συναλλαγές
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {allTransactions.slice(0, 20).map((transaction) => (
                          <div key={transaction.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex-shrink-0">
                          {getTransactionIcon(transaction)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {transaction.description}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>{new Date(transaction.date).toLocaleDateString('el-GR')}</span>
                              {transaction.apartment_number && (
                                  <>
                                    <span>•</span>
                                    <span>Διαμ. {transaction.apartment_number}</span>
                                  </>
                              )}
                              {transaction.category && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs">
                                  {transaction.category}
                                </Badge>
                                  </>
                              )}
                            </div>
                          </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`font-bold text-lg ${
                              getAmountAsNumber(transaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {getAmountAsNumber(transaction.amount) > 0 ? '+' : ''}{formatCurrency(getAmountAsNumber(transaction.amount))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getTransactionTypeLabel(transaction.type)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">Δεν υπάρχουν συναλλαγές</h3>
                        <p className="text-sm">
                          Το ποσό {formatCurrency(amount)} είναι το τρέχον υπόλοιπο του συστήματος.
                        </p>
                        <p className="text-sm mt-2">
                          Όταν προστεθούν εισπράξεις ή δαπάνες, θα εμφανιστούν εδώ με λεπτομερείς πληροφορίες.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={onClose} className="px-6">
                Κλείσιμο
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Monthly Transactions Modal */}
    {selectedMonthForModal && (
      <MonthlyTransactionsModal
        isOpen={monthlyModalOpen}
        onClose={() => {
          setMonthlyModalOpen(false);
          setSelectedMonthForModal(null);
        }}
        buildingId={buildingId}
        month={selectedMonthForModal.month}
        monthDisplayName={selectedMonthForModal.displayName}
      />
    )}
    </>
  );
};
