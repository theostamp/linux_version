'use client';

import React, { useState, useEffect, useImperativeHandle } from 'react';
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
  Calculator
} from 'lucide-react';
import { api } from '@/lib/api';
import TransactionHistory from './TransactionHistory';
import CashFlowChart from './CashFlowChart';
import ReportsManager from './ReportsManager';
import { useRouter } from 'next/navigation';

interface FinancialDashboardProps {
  buildingId: number;
  selectedMonth?: string;
  ref?: React.RefObject<{ loadSummary: () => void }>;
}

const FinancialDashboard = React.forwardRef<{ loadSummary: () => void }, FinancialDashboardProps>(
  ({ buildingId, selectedMonth }, ref) => {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadSummary();
  }, [buildingId, selectedMonth]);

  // Expose loadSummary function via ref
  useImperativeHandle(ref, () => ({
    loadSummary
  }));

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(selectedMonth && { month: selectedMonth })
      });
      
      const response = await api.get(`/financial/dashboard/summary/?${params}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error loading financial summary:', error);
      setError('Σφάλμα κατά τη φόρτωση των οικονομικών στοιχείων');
    } finally {
      setIsLoading(false);
    }
  };

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
      {/* Κάρτες Στατιστικών */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Τρέχον Αποθεματικό
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(summary.current_reserve).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              Διαθέσιμο ποσό
            </p>
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
              {Number(summary.pending_expenses || 0).toFixed(2)}€
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
                .filter(apt => apt.current_balance < 0)
                .sort((a, b) => a.current_balance - b.current_balance)
                .slice(0, 10)
                .map((apartment) => (
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
                        {Number(apartment.current_balance).toFixed(2)}€
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

export default FinancialDashboard; 