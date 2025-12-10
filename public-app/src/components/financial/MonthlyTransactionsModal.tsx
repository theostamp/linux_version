import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Euro, 
  Clock, 
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  X
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: number;
  date: string;
  amount: number | string;
  type: string;
  description: string;
  apartment_number?: string;
  category?: string;
}

interface MonthlyTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingId: number;
  month: string;
  monthDisplayName: string;
}

export const MonthlyTransactionsModal: React.FC<MonthlyTransactionsModalProps> = ({
  isOpen,
  onClose,
  buildingId,
  month,
  monthDisplayName
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadMonthlyTransactions();
    }
  }, [isOpen, buildingId, month]);

  const loadMonthlyTransactions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading monthly transactions for:', { buildingId, month, monthDisplayName });
      
      // Parse month to get year and month
      const [year, monthNum] = month.split('-');
      
      // Load expenses for the specific month
      const expensesParams = new URLSearchParams({
        building_id: buildingId.toString(),
        month: month,  // Use the month parameter in YYYY-MM format
        limit: '100'
      });
      
      console.log('💰 Loading expenses from:', `/financial/expenses/?${expensesParams}`);
      const expensesResponse = await api.get(`/financial/expenses/?${expensesParams}`);
      console.log('💰 Expenses response:', expensesResponse.data);
      console.log('💰 Expenses count:', expensesResponse.data.results?.length || expensesResponse.data?.length || 0);
      const expenses = expensesResponse.data.results || expensesResponse.data || [];
      console.log('💰 First few expenses:', expenses.slice(0, 3).map((exp: any) => ({ id: exp.id, title: exp.title, amount: exp.amount, date: exp.date })));
      setExpenses(expenses);

      // Load payments for the specific month
      const paymentsParams = new URLSearchParams({
        building_id: buildingId.toString(),
        month: month,  // Use the month parameter in YYYY-MM format
        limit: '100'
      });
      
      console.log('💳 Loading payments from:', `/financial/payments/?${paymentsParams}`);
      const paymentsResponse = await api.get(`/financial/payments/?${paymentsParams}`);
      console.log('💳 Payments response:', paymentsResponse.data);
      console.log('💳 Payments count:', paymentsResponse.data.results?.length || paymentsResponse.data?.length || 0);
      
      // Payments are now filtered by building_id in the backend
      const payments = paymentsResponse.data.results || paymentsResponse.data || [];
      setPayments(payments);

      // Calculate summary with improved amount parsing
      const totalExpenses = expenses.reduce((sum: number, exp: any) => {
        const amount = typeof exp.amount === 'string' ? parseFloat(exp.amount) : Number(exp.amount || 0);
        console.log('💰 Expense amount parsing:', { original: exp.amount, parsed: amount, type: typeof exp.amount });
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      const totalPayments = payments.reduce((sum: number, pay: any) => {
        const amount = typeof pay.amount === 'string' ? parseFloat(pay.amount) : Number(pay.amount || 0);
        console.log('💳 Payment amount parsing:', { original: pay.amount, parsed: amount, type: typeof pay.amount });
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      const balance = totalPayments - totalExpenses;
      
      console.log('📊 Summary calculation:', {
        totalExpenses,
        totalPayments,
        balance,
        expensesCount: expenses.length,
        paymentsCount: payments.length
      });

      setSummary({
        totalExpenses,
        totalPayments,
        balance,
        expensesCount: expenses.length,
        paymentsCount: payments.length
      });

    } catch (err: any) {
      console.error('❌ Error loading monthly transactions:', err);
      setError(`Σφάλμα κατά τη φόρτωση των κινήσεων: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'expense_created':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      case 'payment_received':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'expense_created':
        return 'Δαπάνη';
      case 'payment_received':
        return 'Είσπραξη';
      default:
        return 'Συναλλαγή';
    }
  };

  const getAmountAsNumber = (amount: number | string): number => {
    if (typeof amount === 'string') {
      return parseFloat(amount) || 0;
    }
    return amount || 0;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div className="flex flex-col">
              <span>Κινήσεις Μήνα: {monthDisplayName}</span>
              <span className="text-sm font-normal text-gray-600 mt-1">
                Κτίριο ID: {buildingId}
              </span>
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
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Εισπράξεις</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(summary.totalPayments)}
                    </div>
                    <div className="text-sm text-green-600">
                      {summary.paymentsCount} συναλλαγές
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">Δαπάνες</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(summary.totalExpenses)}
                    </div>
                    <div className="text-sm text-red-600">
                      {summary.expensesCount} συναλλαγές
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Euro className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Υπόλοιπο</span>
                    </div>
                    <div className={`text-2xl font-bold ${
                      summary.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(summary.balance)}
                    </div>
                    <div className="text-sm text-blue-600">
                      Εισπράξεις - Δαπάνες
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-800">Σύνολο</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {summary.expensesCount + summary.paymentsCount}
                    </div>
                    <div className="text-sm text-purple-600">
                      συναλλαγές
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Transactions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                    Δαπάνες ({expenses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expenses.length > 0 ? (
                    <div className="space-y-3">
                      {expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-gray-300">
                          {getTransactionIcon('expense_created')}
                          <div className="flex-1">
                            <div className="font-medium text-sm text-red-800">
                              {expense.title}
                            </div>
                            <div className="text-xs text-red-600">
                              {formatDate(expense.date)}
                              {expense.apartment?.number && ` • Διαμ. ${expense.apartment.number}`}
                            </div>
                            {expense.category && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {expense.category}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600">
                              -{formatCurrency(expense.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowDownRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Δεν υπάρχουν δαπάνες για αυτόν τον μήνα</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                    Εισπράξεις ({payments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-gray-300">
                          {getTransactionIcon('payment_received')}
                          <div className="flex-1">
                            <div className="font-medium text-sm text-green-800">
                              Είσπραξη - {payment.payer_name}
                            </div>
                            <div className="text-xs text-green-600">
                              {formatDate(payment.date)}
                              {payment.apartment?.number && ` • Διαμ. ${payment.apartment.number}`}
                            </div>
                            {payment.payment_type && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {payment.payment_type}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              +{formatCurrency(payment.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowUpRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Δεν υπάρχουν εισπράξεις για αυτόν τον μήνα</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <Button onClick={onClose} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Κλείσιμο
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
