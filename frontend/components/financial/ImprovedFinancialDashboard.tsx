'use client';

import React, { useState, useEffect, useImperativeHandle, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Building, 
  Plus, 
  FileText,
  BarChart3,
  Calculator,
  RefreshCw,
  Calendar,
  Receipt,
  PiggyBank,
  Clock
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useMonthRefresh } from '@/hooks/useMonthRefresh';
import useFinancialAutoRefresh from '@/hooks/useFinancialAutoRefresh';

interface ImprovedFinancialDashboardProps {
  buildingId: number;
  selectedMonth?: string;
  ref?: React.RefObject<{ loadSummary: () => void }>;
}

interface MonthlyInvoiceData {
  // Έξοδα προηγούμενου μήνα (π.χ. Ιούλιος)
  previous_month_expenses: {
    operational_expenses: number;
    month_name: string;
  };
  // Χρεώσεις τρέχοντος μήνα (π.χ. Αύγουστος)
  current_month_charges: {
    management_fees: number;
    reserve_fund_contribution: number;
    month_name: string;
  };
  // Σύνολο τιμολογίου
  invoice_total: number;
}

interface TotalObligationsData {
  current_invoice: number;
  previous_balances: number;
  grand_total: number;
}

interface ObligationCoverageData {
  current_invoice_coverage: {
    paid: number;
    total: number;
    percentage: number;
  };
  total_obligations_coverage: {
    paid: number;
    total: number;
    percentage: number;
  };
}

interface ImprovedFinancialData {
  monthly_invoice: MonthlyInvoiceData;
  total_obligations: TotalObligationsData;
  obligation_coverage: ObligationCoverageData;
  reserve_fund: {
    current_amount: number;
    target_amount: number;
    monthly_contribution: number;
    progress_percentage: number;
  };
  apartment_count: number;
  has_monthly_activity: boolean;
}

const ImprovedFinancialDashboard = React.forwardRef<{ loadSummary: () => void }, ImprovedFinancialDashboardProps>(
  ({ buildingId, selectedMonth }, ref) => {
  const [data, setData] = useState<ImprovedFinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔄 ImprovedFinancialDashboard: Loading data for building ${buildingId}, month: ${selectedMonth || 'current'}`);
      
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(selectedMonth && { month: selectedMonth })
      });
      
      const response = await api.get(`/financial/dashboard/improved-summary/?${params}`);
      setData(response.data);
      
      console.log(`✅ ImprovedFinancialDashboard: Data loaded successfully`);
    } catch (error) {
      console.error('Error loading improved financial data:', error);
      setError('Σφάλμα κατά τη φόρτωση των οικονομικών στοιχείων');
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, selectedMonth]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Auto-refresh when selectedMonth changes
  useMonthRefresh(selectedMonth, loadSummary, 'ImprovedFinancialDashboard');

  // Auto-refresh financial dashboard when expenses/payments change
  useFinancialAutoRefresh(
    {
      loadSummary,
    },
    {
      buildingId,
      selectedMonth,
    },
    {
      enableAutoRefresh: false,
      refreshInterval: 10000,
      componentName: 'ImprovedFinancialDashboard'
    }
  );

  // Expose loadSummary function via ref
  useImperativeHandle(ref, () => ({
    loadSummary
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </CardTitle>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="text-center py-8 text-red-600">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              Δεν βρέθηκαν οικονομικά στοιχεία
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMonthName = selectedMonth ? 
    new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) :
    new Date().toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });

  const previousMonthName = data?.monthly_invoice?.previous_month_expenses?.month_name || 'Προηγούμενος μήνας';

  return (
    <div className="space-y-6">
      {/* Κουμπί Manual Refresh */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            Οικονομική Κατάσταση - {currentMonthName}
          </h2>
        </div>
        <Button
          onClick={loadSummary}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Ενημέρωση
        </Button>
      </div>

      {/* 1. ΤΙΜΟΛΟΓΙΟ ΜΗΝΑ */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Receipt className="h-5 w-5" />
            📋 ΤΙΜΟΛΟΓΙΟ {currentMonthName.toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Έξοδα προηγούμενου μήνα */}
          <div className="bg-white p-4 rounded-lg border border-blue-100">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Έξοδα {previousMonthName} (τιμολογούμενα {currentMonthName})
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      Λειτουργικές δαπάνες
                    </Badge>
                  </div>
                  <span className="font-semibold text-blue-900">
                    {formatCurrency(data?.monthly_invoice?.previous_month_expenses?.operational_expenses || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Χρεώσεις τρέχοντος μήνα */}
          <div className="bg-white p-4 rounded-lg border border-blue-100">
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">
                Πρόσθετες χρεώσεις {currentMonthName}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Κόστος διαχείρισης:</span>
                <span className="font-semibold">
                  {formatCurrency(data?.monthly_invoice?.current_month_charges?.management_fees || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Εισφορά αποθεματικού:</span>
                <span className="font-semibold">
                  {formatCurrency(data?.monthly_invoice?.current_month_charges?.reserve_fund_contribution || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Σύνολο τιμολογίου */}
          <div className="bg-blue-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">💰 Σύνολο τιμολογίου {currentMonthName}:</span>
              <span className="text-2xl font-bold">
                {formatCurrency(data?.monthly_invoice?.invoice_total || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. ΣΥΝΟΛΙΚΕΣ ΟΦΕΙΛΕΣ */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <Calculator className="h-5 w-5" />
            📈 ΣΥΝΟΛΙΚΕΣ ΟΦΕΙΛΕΣ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-orange-100">
              <div className="text-sm text-gray-600 mb-1">Τιμολόγιο {currentMonthName}</div>
              <div className="text-xl font-bold text-orange-700">
                {formatCurrency(data?.total_obligations?.current_invoice || 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-orange-100">
              <div className="text-sm text-gray-600 mb-1">Προηγούμενα υπόλοιπα</div>
              <div className="text-xl font-bold text-orange-700">
                {formatCurrency(data?.total_obligations?.previous_balances || 0)}
              </div>
            </div>
          </div>
          
          <div className="bg-orange-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">🔴 Συνολικές οφειλές:</span>
              <span className="text-2xl font-bold">
                {formatCurrency(data?.total_obligations?.grand_total || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. ΚΑΛΥΨΗ ΥΠΟΧΡΕΩΣΕΩΝ */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <BarChart3 className="h-5 w-5" />
            📊 ΚΑΛΥΨΗ ΥΠΟΧΡΕΩΣΕΩΝ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Κάλυψη τιμολογίου τρέχοντος μήνα */}
          <div className="bg-white p-4 rounded-lg border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-700">
                Κάλυψη τιμολογίου {currentMonthName}
              </span>
              <Badge variant={(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0) >= 100 ? "default" : "secondary"}>
                {(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0).toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={Math.min(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0, 100)} 
              className="h-3 mb-2"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Πληρωμένα: {formatCurrency(data?.obligation_coverage?.current_invoice_coverage?.paid || 0)}
              </span>
              <span>
                Σύνολο: {formatCurrency(data?.obligation_coverage?.current_invoice_coverage?.total || 0)}
              </span>
            </div>
          </div>

          {/* Κάλυψη συνολικών οφειλών */}
          <div className="bg-white p-4 rounded-lg border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-700">
                Κάλυψη συνολικών οφειλών
              </span>
              <Badge variant={(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) >= 100 ? "default" : "destructive"}>
                {(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0).toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={Math.min(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0, 100)} 
              className="h-3 mb-2"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Εισπράξεις: {formatCurrency(data?.obligation_coverage?.total_obligations_coverage?.paid || 0)}
              </span>
              <span>
                Υποχρεώσεις: {formatCurrency(data?.obligation_coverage?.total_obligations_coverage?.total || 0)}
              </span>
            </div>
          </div>

          {/* Κατάσταση κάλυψης */}
          <div className={`p-4 rounded-lg border ${
            (data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) >= 100 
              ? 'bg-green-100 border-green-200 text-green-800'
              : (data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) >= 50
              ? 'bg-yellow-100 border-yellow-200 text-yellow-800'
              : 'bg-red-100 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) >= 100 ? (
                <>
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-medium">Εξαιρετική κάλυψη - όλες οι υποχρεώσεις καλύπτονται</span>
                </>
              ) : (data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) >= 50 ? (
                <>
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Μέτρια κάλυψη - χρειάζονται περισσότερες εισπράξεις</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Χαμηλή κάλυψη - απαιτούνται άμεσες εισπράξεις</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. ΑΠΟΘΕΜΑΤΙΚΟ & ΣΤΟΧΟΙ */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <PiggyBank className="h-5 w-5" />
            🎯 ΑΠΟΘΕΜΑΤΙΚΟ & ΣΤΟΧΟΙ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-purple-100 text-center">
              <div className="text-sm text-gray-600 mb-1">Τρέχον αποθεματικό</div>
              <div className="text-xl font-bold text-purple-700">
                {formatCurrency(data?.reserve_fund?.current_amount || 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-purple-100 text-center">
              <div className="text-sm text-gray-600 mb-1">Στόχος αποθεματικού</div>
              <div className="text-xl font-bold text-purple-700">
                {formatCurrency(data?.reserve_fund?.target_amount || 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-purple-100 text-center">
              <div className="text-sm text-gray-600 mb-1">Μηνιαία εισφορά</div>
              <div className="text-xl font-bold text-purple-700">
                {formatCurrency(data?.reserve_fund?.monthly_contribution || 0)}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-700">Πρόοδος στόχου</span>
              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                {(data?.reserve_fund?.progress_percentage || 0).toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={Math.min(data?.reserve_fund?.progress_percentage || 0, 100)} 
              className="h-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. ΣΥΝΟΨΗ ΚΤΙΡΙΟΥ */}
      <Card className="border-gray-200 bg-gray-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Building className="h-5 w-5" />
            🏢 ΣΥΝΟΨΗ ΚΤΙΡΙΟΥ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
              <div className="text-sm text-gray-600 mb-1">Διαμερίσματα</div>
              <div className="text-2xl font-bold text-gray-700">
                {data?.apartment_count || 0}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
              <div className="text-sm text-gray-600 mb-1">Κατάσταση δεδομένων</div>
              <Badge variant={data?.has_monthly_activity ? "default" : "secondary"}>
                {data?.has_monthly_activity ? "Ενημερωμένα" : "Χωρίς διακανονισμό"}
              </Badge>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
              <div className="text-sm text-gray-600 mb-1">Περίοδος</div>
              <div className="text-lg font-semibold text-gray-700">
                {currentMonthName}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ImprovedFinancialDashboard.displayName = 'ImprovedFinancialDashboard';

export default ImprovedFinancialDashboard;
