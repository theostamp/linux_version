'use client';

import React, { useState, useEffect, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building, 
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  Calculator
} from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { el } from 'date-fns/locale/el';

interface FinancialOverviewProps {
  buildingId: number;
}

interface FinancialStats {
  current_reserve: number;
  total_obligations: number;
  total_expenses_month: number;
  total_payments_month: number;
  pending_expenses: number;
  recent_transactions_count: number;
  apartment_balances: Array<{
    apartment_id: number;
    apartment_number: string;
    owner_name: string;
    current_balance: number;
    last_payment_date?: string;
  }>;
  payment_statistics: {
    total_payments: number;
    average_payment: number;
    payment_methods: Array<{
      method: string;
      count: number;
      total: number;
    }>;
  };
}

const FinancialOverview = React.forwardRef<{ loadSummary: () => void }, FinancialOverviewProps>(
  ({ buildingId }, ref) => {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    loadFinancialStats();
  }, [buildingId, selectedPeriod]);

  // Expose loadSummary function via ref
  useImperativeHandle(ref, () => ({
    loadSummary: loadFinancialStats
  }));

  const loadFinancialStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        period: selectedPeriod
      });
      
      const response = await api.get(`/financial/dashboard/summary/?${params}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading financial stats:', error);
      setError('Σφάλμα κατά τη φόρτωση των οικονομικών στοιχείων');
    } finally {
      setIsLoading(false);
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance >= 0) return 'text-green-600';
    if (balance >= -100) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBalanceIcon = (balance: number) => {
    if (balance >= 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
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
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Δεν βρέθηκαν οικονομικά στοιχεία
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Περίοδος Επιλογής */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Οικονομική Επισκόπηση</h2>
        <div className="flex gap-2">
          <Button
            variant={selectedPeriod === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('month')}
          >
            Μήνας
          </Button>
          <Button
            variant={selectedPeriod === 'quarter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('quarter')}
          >
            Τρίμηνο
          </Button>
          <Button
            variant={selectedPeriod === 'year' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('year')}
          >
            Έτος
          </Button>
        </div>
      </div>

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
            <div className="text-2xl font-bold text-green-600">
              {Number(stats.current_reserve).toFixed(2)}€
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
              {Number(stats.pending_expenses).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              Δεν έχουν εκδοθεί
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Δαπάνες {selectedPeriod === 'month' ? 'Μήνα' : selectedPeriod === 'quarter' ? 'Τριμήνου' : 'Έτους'}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Number(stats.total_expenses_month).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              Συνολικές δαπάνες
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Εισπράξεις {selectedPeriod === 'month' ? 'Μήνα' : selectedPeriod === 'quarter' ? 'Τριμήνου' : 'Έτους'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Number(stats.total_payments_month).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              Συνολικές εισπράξεις
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Γράφημα Κατανομής Οφειλών */}
      {stats.apartment_balances && stats.apartment_balances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Κατανομή Οφειλών ανά Διαμέρισμα
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.apartment_balances
                .filter(apt => apt.current_balance < 0)
                .sort((a, b) => a.current_balance - b.current_balance)
                .slice(0, 10)
                .map((apartment) => (
                  <div key={apartment.apartment_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                    <div className="flex items-center space-x-2">
                      {getBalanceIcon(apartment.current_balance)}
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getBalanceColor(apartment.current_balance)}`}>
                          {Number(apartment.current_balance).toFixed(2)}€
                        </p>
                        {apartment.last_payment_date && (
                          <p className="text-xs text-muted-foreground">
                            Τελευταία είσπραξη: {format(new Date(apartment.last_payment_date), 'dd/MM/yyyy', { locale: el })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Στατιστικά Πληρωμών */}
      {stats.payment_statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Στατιστικά Πληρωμών
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.payment_statistics.total_payments}
                </div>
                <p className="text-sm text-muted-foreground">Συνολικές Πληρωμές</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Number(stats.payment_statistics.average_payment).toFixed(2)}€
                </div>
                <p className="text-sm text-muted-foreground">Μέση Πληρωμή</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.payment_statistics.payment_methods.length}
                </div>
                <p className="text-sm text-muted-foreground">Τρόποι Πληρωμής</p>
              </div>
            </div>
            
            {/* Κατανομή Τρόπων Πληρωμής */}
            {stats.payment_statistics.payment_methods.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Κατανομή ανά Τρόπο Πληρωμής</h4>
                <div className="space-y-2">
                  {stats.payment_statistics.payment_methods.map((method, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{method.method}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{method.count}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {Number(method.total).toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}


    </div>
  );
});

export default FinancialOverview; 