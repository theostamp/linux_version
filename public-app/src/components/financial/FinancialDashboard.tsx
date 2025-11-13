'use client';

import React, { useState, useEffect, useImperativeHandle, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import TransactionHistory from './TransactionHistory';
import CashFlowChart from './CashFlowChart';
import ReportsManager from './ReportsManager';
import { useRouter } from 'next/navigation';
import { useMonthRefresh } from '@/hooks/useMonthRefresh';
import useFinancialAutoRefresh from '@/hooks/useFinancialAutoRefresh';
import { useQueryClient } from '@tanstack/react-query';

interface FinancialDashboardProps {
  buildingId: number;
  selectedMonth?: string;
  ref?: React.RefObject<{ loadSummary: () => void }>;
}

interface ApartmentBalance {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  current_balance: number;
  last_payment_date?: string;
}

const FinancialDashboard = React.forwardRef<{ loadSummary: () => void }, FinancialDashboardProps>(
  ({ buildingId, selectedMonth }, ref) => {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const loadSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔄 FinancialDashboard: Loading summary for building ${buildingId}, month: ${selectedMonth || 'current'}`);
      
      // 🧹 Cache invalidation - Clear all financial-related queries
      await queryClient.invalidateQueries({ 
        queryKey: ['financial'] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['apartment-balances'] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['expenses'] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['transactions'] 
      });
      
      console.log(`🧹 FinancialDashboard: Cache invalidated for financial data`);
      
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(selectedMonth && { month: selectedMonth })
      });
      
      const response = await api.get(`/financial/dashboard/summary/?${params}`);
      // The api.get returns data directly
      setSummary(response);
      
      console.log(`✅ FinancialDashboard: Summary loaded successfully for ${selectedMonth || 'current'}`);
      console.log(`📊 FinancialDashboard: Reserve Fund Data:`, {
        current_reserve: response.current_reserve,
        total_balance: response.total_balance,
        reserve_fund_contribution: response.reserve_fund_contribution,
        has_monthly_activity: response.has_monthly_activity,
        selectedMonth: selectedMonth || 'current'
      });
    } catch (error) {
      console.error('Error loading financial summary:', error);
      setError('Σφάλμα κατά τη φόρτωση των οικονομικών στοιχείων');
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, selectedMonth, queryClient]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Auto-refresh when selectedMonth changes
  useMonthRefresh(selectedMonth, loadSummary, 'FinancialDashboard');

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
      enableAutoRefresh: false, // Απενεργοποιημένο auto-refresh
      refreshInterval: 10000, // 10 seconds
      componentName: 'FinancialDashboard'
    }
  );

  // Expose loadSummary function via ref
  useImperativeHandle(ref, () => ({
    loadSummary
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
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

  if (!summary) {
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

  return (
    <div className="space-y-6">
      {/* Κουμπί Manual Refresh */}
      <div className="flex justify-end">
        <Button
          onClick={loadSummary}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Ενημέρωση Δεδομένων
        </Button>
      </div>
      
      {/* Κάρτες Στατιστικών */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Τρέχον Αποθεματικό
              {selectedMonth && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'short', year: 'numeric' })}
                </span>
              )}
              {selectedMonth && summary.has_monthly_activity === false && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Χωρίς διακανονισμό
                </span>
              )}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* Conditional display based on monthly activity */}
            {selectedMonth && summary.has_monthly_activity === false ? (
              <div className="text-center py-4">
                <div className="text-lg text-gray-400 mb-2">—</div>
                <p className="text-xs text-gray-500">
                  Δεν υπάρχει διακανονισμός για αυτόν τον μήνα
                </p>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.current_reserve)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedMonth ? 'Ιστορικό υπόλοιπο' : 'Διαθέσιμο ποσό'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ανέκδοτες Δαπάνες
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.pending_expenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Δεν έχουν εκδοθεί
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Τελευταίες Κινήσεις
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.recent_transactions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Τελευταίες 30 ημέρες
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Κατάσταση Διαμερισμάτων
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.apartment_balances?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Ενεργά διαμερίσματα
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Γράφημα Κατανομής Οφειλών */}
      {summary.apartment_balances && summary.apartment_balances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Κατανομή Οφειλών ανά Διαμέρισμα</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.apartment_balances
                .filter((apt: ApartmentBalance) => apt.current_balance < 0)
                .sort((a: ApartmentBalance, b: ApartmentBalance) => {
                  return Math.abs(a.current_balance) - Math.abs(b.current_balance);
                })
                .slice(0, 10)
                .map((apartment: ApartmentBalance) => (
                  <div key={apartment.apartment_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Διαμέρισμα {apartment.apartment_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apartment.owner_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        Number(apartment.current_balance) < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(apartment.current_balance)}
                      </p>
                      {apartment.last_payment_date && (
                        <p className="text-xs text-muted-foreground">
                          Τελευταία είσπραξη: {new Date(apartment.last_payment_date).toLocaleDateString('el-GR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs για λεπτομερείς αναφορές */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Κινήσεις
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Ταμειακή Ροή
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Οφειλές
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Αναφορές
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionHistory buildingId={buildingId} />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <CashFlowChart buildingId={buildingId} />
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          {/* Εδώ θα μπορούσε να μπει το ApartmentBalances component */}
          <Card>
            <CardHeader>
              <CardTitle>Κατάσταση Οφειλών Διαμερισμάτων</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Το component ApartmentBalances θα εμφανιστεί εδώ</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsManager buildingId={buildingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
});

FinancialDashboard.displayName = 'FinancialDashboard';

export { FinancialDashboard }; 