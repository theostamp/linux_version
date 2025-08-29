'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Euro, 
  Info,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { makeRequestWithRetry } from '@/lib/api';

interface PaymentProgressVisualizationProps {
  buildingId: number;
  selectedMonth?: string;
}

interface PaymentProgressVisualizationRef {
  refresh: () => void;
}

interface FinancialSummary {
  total_balance: number;
  current_obligations: number;
  previous_obligations: number;
  reserve_fund_debt: number;
  reserve_fund_goal: number;
  current_reserve: number;
  apartments_count: number;
  pending_payments: number;
  average_monthly_expenses: number;
  management_fee_per_apartment: number;
  total_management_cost: number;
  reserve_fund_monthly_target: number;
  reserve_fund_contribution: number;
  total_payments_month?: number;
  total_expenses_month?: number;
}

interface ProgressSegment {
  id: string;
  label: string;
  amount: number;
  target: number;
  percentage: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  description: string;
  priority: number;
}

export const PaymentProgressVisualization = React.forwardRef<
  PaymentProgressVisualizationRef,
  PaymentProgressVisualizationProps
>(({
  buildingId,
  selectedMonth
}, ref) => {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  // Fetch financial summary data
  const fetchFinancialSummary = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        building_id: buildingId.toString()
      });
      
      if (selectedMonth && selectedMonth !== 'null' && selectedMonth !== '') {
        params.append('month', selectedMonth);
      }
      
      const response = await makeRequestWithRetry({
        method: 'get',
        url: `/financial/dashboard/summary/?${params}`
      });
      
      const apiData = response.data;
      
      // Transform API data to match our interface
      const financialData: FinancialSummary = {
        total_balance: apiData.total_balance || 0,
        current_obligations: apiData.current_obligations || 0,
        previous_obligations: apiData.previous_obligations || 0,
        reserve_fund_debt: apiData.reserve_fund_debt || 0,
        reserve_fund_goal: apiData.reserve_fund_goal || 0,
        current_reserve: apiData.current_reserve || 0,
        apartments_count: apiData.apartments_count || 0,
        pending_payments: apiData.pending_payments || 0,
        average_monthly_expenses: apiData.average_monthly_expenses || 0,
        management_fee_per_apartment: apiData.management_fee_per_apartment || 0,
        total_management_cost: apiData.total_management_cost || 0,
        reserve_fund_monthly_target: apiData.reserve_fund_monthly_target || 0,
        reserve_fund_contribution: apiData.reserve_fund_contribution || 0,
        total_payments_month: apiData.total_payments_month || 0,
        total_expenses_month: apiData.total_expenses_month || 0
      };
      
      setFinancialSummary(financialData);
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      setFinancialSummary(null);
    } finally {
      setLoading(false);
    }
  }, [buildingId, selectedMonth]);

  useEffect(() => {
    fetchFinancialSummary();
  }, [fetchFinancialSummary]);

  // Expose refresh function via ref
  React.useImperativeHandle(ref, () => ({
    refresh: fetchFinancialSummary
  }));

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0,00 €';
    }
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Calculate progress segments based on payment priorities
  const calculateProgressSegments = (): ProgressSegment[] => {
    if (!financialSummary) return [];

    const totalPayments = financialSummary.total_payments_month || 0;
    let remainingPayments = totalPayments;

    const segments: ProgressSegment[] = [];

    // 1. Management Costs (Highest Priority)
    const managementCost = financialSummary.total_management_cost || 0;
    if (managementCost > 0) {
      const managementCovered = Math.min(remainingPayments, managementCost);
      const managementPercentage = (managementCovered / managementCost) * 100;
      
      segments.push({
        id: 'management',
        label: 'Κόστος Διαχείρισης',
        amount: managementCovered,
        target: managementCost,
        percentage: managementPercentage,
        color: 'bg-blue-600',
        bgColor: 'bg-blue-100',
        icon: <TrendingUp className="h-4 w-4" />,
        description: 'Αμοιβές διαχείρισης κτιρίου',
        priority: 1
      });
      
      remainingPayments -= managementCovered;
    }

    // 2. Monthly Expenses (Second Priority)
    const monthlyExpenses = financialSummary.average_monthly_expenses || 0;
    if (monthlyExpenses > 0 && remainingPayments > 0) {
      const expensesCovered = Math.min(remainingPayments, monthlyExpenses);
      const expensesPercentage = (expensesCovered / monthlyExpenses) * 100;
      
      segments.push({
        id: 'expenses',
        label: 'Μηνιαία Έξοδα',
        amount: expensesCovered,
        target: monthlyExpenses,
        percentage: expensesPercentage,
        color: 'bg-orange-600',
        bgColor: 'bg-orange-100',
        icon: <Euro className="h-4 w-4" />,
        description: 'Κοινόχρηστα και λειτουργικά έξοδα',
        priority: 2
      });
      
      remainingPayments -= expensesCovered;
    }

    // 3. Reserve Fund (Third Priority)
    const reserveTarget = financialSummary.reserve_fund_monthly_target || 0;
    if (reserveTarget > 0 && remainingPayments > 0) {
      const reserveCovered = Math.min(remainingPayments, reserveTarget);
      const reservePercentage = (reserveCovered / reserveTarget) * 100;
      
      segments.push({
        id: 'reserve',
        label: 'Εισφορά Αποθεματικού',
        amount: reserveCovered,
        target: reserveTarget,
        percentage: reservePercentage,
        color: 'bg-green-600',
        bgColor: 'bg-green-100',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Συσσώρευση αποθεματικού ταμείου',
        priority: 3
      });
      
      remainingPayments -= reserveCovered;
    }

    return segments;
  };

  const segments = calculateProgressSegments();
  const totalTarget = segments.reduce((sum, segment) => sum + segment.target, 0);
  const totalCovered = segments.reduce((sum, segment) => sum + segment.amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCovered / totalTarget) * 100 : 0;

  if (loading) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-4">
          <div className="animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-6 w-6 bg-gray-300 rounded"></div>
              <div className="h-6 bg-gray-300 rounded w-2/3"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-full mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!financialSummary) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Σφάλμα Φόρτωσης
          </h3>
          <p className="text-red-600 mb-4">
            Δεν ήταν δυνατή η φόρτωση των οικονομικών δεδομένων.
          </p>
          <Button onClick={fetchFinancialSummary} variant="outline">
            Δοκιμή Ξανά
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900">
                  Εικόνα Εισπράξεων
                </h2>
                <p className="text-sm text-blue-700 mt-1">
                  Οπτικοποίηση προόδου εισπράξεων ανάλογα με τις προτεραιότητες
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Info className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        {showInfo && (
          <CardContent className="pt-0">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Πώς λειτουργεί:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Κόστος Διαχείρισης:</strong> Πρώτη προτεραιότητα - πληρώνεται πρώτα</li>
                <li>• <strong>Μηνιαία Έξοδα:</strong> Δεύτερη προτεραιότητα - κοινόχρηστα και λειτουργικά</li>
                <li>• <strong>Εισφορά Αποθεματικού:</strong> Τρίτη προτεραιότητα - συσσώρευση ταμείου</li>
                <li>• Η μπάρα δείχνει πώς κατανέμονται οι εισπράξεις σε κάθε κατηγορία</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Progress Visualization */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Προοδος Εισπράξεων
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Κατανομή εισπράξεων ανάλογα με τις προτεραιότητες
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(financialSummary.total_payments_month || 0)}
              </div>
              <div className="text-sm text-gray-600">
                Συνολικές εισπράξεις
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Συνολική κάλυψη:</span>
              <span className="text-sm font-bold text-gray-800">
                {overallProgress.toFixed(1)}%
              </span>
            </div>
            
            {/* Main Progress Bar */}
            <div className="relative w-full h-8 bg-gray-200 rounded-lg overflow-hidden">
              {segments.map((segment, index) => {
                const segmentWidth = (segment.amount / totalTarget) * 100;
                const leftOffset = segments
                  .slice(0, index)
                  .reduce((sum, s) => sum + (s.amount / totalTarget) * 100, 0);
                
                return (
                  <div
                    key={segment.id}
                    className={`absolute h-full ${segment.color} transition-all duration-500 ease-out`}
                    style={{
                      left: `${leftOffset}%`,
                      width: `${segmentWidth}%`
                    }}
                    title={`${segment.label}: ${formatCurrency(segment.amount)} / ${formatCurrency(segment.target)} (${segment.percentage.toFixed(1)}%)`}
                  />
                );
              })}
              
              {/* Progress Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white drop-shadow-lg">
                  {formatCurrency(totalCovered)} / {formatCurrency(totalTarget)}
                </span>
              </div>
            </div>
          </div>

          {/* Segment Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">Ανάλυση καλύψης:</h4>
            
            {segments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <div className="text-sm">Δεν υπάρχουν δεδομένα εισπράξεων</div>
                <div className="text-xs text-gray-400 mt-1">
                  Προσθέστε εισπράξεις για να δείτε την ανάλυση
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={`p-4 rounded-lg border-2 ${segment.bgColor} border-gray-200`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-2 rounded-full ${segment.color.replace('bg-', 'bg-opacity-20')}`}>
                        {segment.icon}
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 text-sm">
                          {segment.label}
                        </h5>
                        <p className="text-xs text-gray-600">
                          Προτεραιότητα {segment.priority}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Καλύπτεται:</span>
                        <span className="text-sm font-bold text-gray-800">
                          {formatCurrency(segment.amount)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Στόχος:</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {formatCurrency(segment.target)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Πρόοδος:</span>
                        <span className="text-sm font-bold text-gray-800">
                          {segment.percentage.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* Mini Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${segment.color} transition-all duration-300`}
                          style={{ width: `${Math.min(100, segment.percentage)}%` }}
                        />
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-2">
                        {segment.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(financialSummary.total_payments_month || 0)}
              </div>
              <div className="text-xs text-gray-600">Συνολικές Εισπράξεις</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {formatCurrency(totalTarget)}
              </div>
              <div className="text-xs text-gray-600">Συνολικός Στόχος</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(totalCovered)}
              </div>
              <div className="text-xs text-gray-600">Καλυμμένο Ποσό</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(Math.max(0, totalTarget - totalCovered))}
              </div>
              <div className="text-xs text-gray-600">Εκκρεμεί</div>
            </div>
          </div>

          {/* Status Message */}
          <div className={`p-4 rounded-lg border ${
            overallProgress >= 100 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : overallProgress >= 80 
                ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {overallProgress >= 100 ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <span className="font-medium">
                {overallProgress >= 100 
                  ? 'Όλες οι υποχρεώσεις έχουν καλυφθεί!' 
                  : overallProgress >= 80 
                    ? 'Καλή κάλυψη - χρειάζεται επιπλέον εισπράξεις'
                    : 'Χαμηλή κάλυψη - απαιτούνται άμεσες εισπράξεις'
                }
              </span>
            </div>
            <div className="text-sm mt-2 opacity-75">
              {overallProgress >= 100 
                ? 'Το κτίριο έχει καλύψει όλες τις μηνιαίες υποχρεώσεις.'
                : `Χρειάζεται επιπλέον ${formatCurrency(Math.max(0, totalTarget - totalCovered))} για πλήρη κάλυψη.`
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Information */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Περίοδος:</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedMonth ? 
                new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : 
                'Τρέχων Μήνας'
              }
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

PaymentProgressVisualization.displayName = 'PaymentProgressVisualization';
