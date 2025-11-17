'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Expense, ExpenseCategory } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ExpenseBreakdownProps {
  expenses: Expense[];
  isLoading?: boolean;
  showChart?: boolean;
  period?: 'month' | 'quarter' | 'year' | 'all';
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({
  expenses,
  isLoading = false,
  showChart = true,
  period = 'all',
}) => {
  const breakdown = useMemo(() => {
    if (!expenses) return {};

    const filteredExpenses = expenses.filter(expense => {
      if (period === 'all') return true;
      
      const expenseDate = new Date(expense.date);
      const now = new Date();
      
      switch (period) {
        case 'month':
          return expenseDate.getMonth() === now.getMonth() && 
                 expenseDate.getFullYear() === now.getFullYear();
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          const expenseQuarter = Math.floor(expenseDate.getMonth() / 3);
          return expenseQuarter === quarter && 
                 expenseDate.getFullYear() === now.getFullYear();
        case 'year':
          return expenseDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });

    const categoryTotals: Record<string, number> = {
      [ExpenseCategory.ELECTRICITY_COMMON]: 0,
      [ExpenseCategory.WATER_COMMON]: 0,
      [ExpenseCategory.HEATING_FUEL]: 0,
      [ExpenseCategory.CLEANING]: 0,
      [ExpenseCategory.MAINTENANCE_GENERAL]: 0,
      [ExpenseCategory.BUILDING_INSURANCE]: 0,
      [ExpenseCategory.MANAGEMENT_FEES]: 0,
      [ExpenseCategory.MISCELLANEOUS]: 0,
    };

    const payerTotals = {
      resident: 0,
      owner: 0,
      shared: 0,
    };

    filteredExpenses.forEach(expense => {
      const category = expense.category as ExpenseCategory;
      const title = expense.title || 'Χωρίς τίτλο';
      
      if (categoryTotals[category] !== undefined) {
        categoryTotals[category]! += expense.amount;
      } else {
        categoryTotals[ExpenseCategory.MISCELLANEOUS] = (categoryTotals[ExpenseCategory.MISCELLANEOUS] || 0) + expense.amount;
      }

      // Ομαδοποίηση ανά ευθύνη πληρωμής
      if (expense.payer_responsibility === 'resident') {
        payerTotals.resident += expense.amount;
      } else if (expense.payer_responsibility === 'owner') {
        payerTotals.owner += expense.amount;
      } else if (expense.payer_responsibility === 'shared') {
        payerTotals.shared += expense.amount;
      }
    });

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return {
      categoryTotals,
      payerTotals,
      total,
      count: filteredExpenses.length,
      period,
    };
  }, [expenses, period]);

  const getCategoryLabel = (category: ExpenseCategory) => {
    const labels: Partial<Record<ExpenseCategory, string>> = {
      [ExpenseCategory.ELECTRICITY_COMMON]: 'Ηλεκτρισμός',
      [ExpenseCategory.WATER_COMMON]: 'Νερό',
      [ExpenseCategory.HEATING_FUEL]: 'Θέρμανση',
      [ExpenseCategory.CLEANING]: 'Καθαριότητα',
      [ExpenseCategory.MAINTENANCE_GENERAL]: 'Συντήρηση',
      [ExpenseCategory.BUILDING_INSURANCE]: 'Ασφάλεια',
      [ExpenseCategory.MANAGEMENT_FEES]: 'Διοίκηση',
      [ExpenseCategory.MISCELLANEOUS]: 'Άλλο',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: ExpenseCategory) => {
    const colors: Partial<Record<ExpenseCategory, string>> = {
      [ExpenseCategory.ELECTRICITY_COMMON]: 'bg-blue-100 text-blue-800',
      [ExpenseCategory.WATER_COMMON]: 'bg-cyan-100 text-cyan-800',
      [ExpenseCategory.HEATING_FUEL]: 'bg-orange-100 text-orange-800',
      [ExpenseCategory.CLEANING]: 'bg-green-100 text-green-800',
      [ExpenseCategory.MAINTENANCE_GENERAL]: 'bg-purple-100 text-purple-800',
      [ExpenseCategory.BUILDING_INSURANCE]: 'bg-red-100 text-red-800',
      [ExpenseCategory.MANAGEMENT_FEES]: 'bg-gray-100 text-gray-800',
      [ExpenseCategory.MISCELLANEOUS]: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: ExpenseCategory) => {
    const icons: Partial<Record<ExpenseCategory, string>> = {
      [ExpenseCategory.ELECTRICITY_COMMON]: '⚡',
      [ExpenseCategory.WATER_COMMON]: '💧',
      [ExpenseCategory.HEATING_FUEL]: '🔥',
      [ExpenseCategory.CLEANING]: '🧹',
      [ExpenseCategory.MAINTENANCE_GENERAL]: '🔧',
      [ExpenseCategory.BUILDING_INSURANCE]: '🛡️',
      [ExpenseCategory.MANAGEMENT_FEES]: '📋',
      [ExpenseCategory.MISCELLANEOUS]: '📦',
    };
    return icons[category] || '📦';
  };

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      'month': 'Τρέχοντος Μήνα',
      'quarter': 'Τρέχοντος Τριμήνου',
      'year': 'Τρέχοντος Έτους',
      'all': 'Όλων των Περιόδων',
    };
    return labels[period] || period;
  };

  const sortedCategories = Object.entries(breakdown.categoryTotals || {})
    .filter(([_, amount]) => amount > 0)
    .sort(([_, a], [__, b]) => b - a);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Ανάλυση Δαπανών</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {getPeriodLabel(breakdown.period || 'all')}
            </Badge>
            <Badge variant="secondary">
              {breakdown.count || 0} δαπάνες
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Συνολικό Ποσό</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(breakdown.total || 0)}
            </p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Μέση Δαπάνη</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency((breakdown.total || 0) / Math.max(breakdown.count || 1, 1))}
            </p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Κατηγορίες</p>
            <p className="text-2xl font-bold text-green-600">
              {sortedCategories.length}
            </p>
          </div>
        </div>

        {/* Payer Responsibility Breakdown */}
        {breakdown.payerTotals && (breakdown.payerTotals.resident > 0 || breakdown.payerTotals.owner > 0 || breakdown.payerTotals.shared > 0) && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Κατανομή ανά Ευθύνη Πληρωμής</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {breakdown.payerTotals.resident > 0 && (
                <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        🟢 Ε
                      </Badge>
                      <h4 className="font-semibold">Δαπάνες Ενοίκων</h4>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(breakdown.payerTotals.resident)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {breakdown.total ? ((breakdown.payerTotals.resident / breakdown.total) * 100).toFixed(1) : '0'}% του συνόλου
                  </p>
                </div>
              )}
              {breakdown.payerTotals.owner > 0 && (
                <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        🔴 Δ
                      </Badge>
                      <h4 className="font-semibold">Δαπάνες Ιδιοκτητών</h4>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    {formatCurrency(breakdown.payerTotals.owner)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {breakdown.total ? ((breakdown.payerTotals.owner / breakdown.total) * 100).toFixed(1) : '0'}% του συνόλου
                  </p>
                </div>
              )}
              {breakdown.payerTotals.shared > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        🔵 Κ
                      </Badge>
                      <h4 className="font-semibold">Κοινές Δαπάνες</h4>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(breakdown.payerTotals.shared)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {breakdown.total ? ((breakdown.payerTotals.shared / breakdown.total) * 100).toFixed(1) : '0'}% του συνόλου
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Κατανομή ανά Κατηγορία</h3>
          <div className="space-y-3">
            {sortedCategories.map(([category, amount]) => {
              const percentage = breakdown.total ? (amount / breakdown.total) * 100 : 0;
              return (
                <div
                  key={category}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getCategoryIcon(category as ExpenseCategory)}</span>
                      <div>
                        <h4 className="font-semibold">
                          {getCategoryLabel(category as ExpenseCategory)}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {percentage.toFixed(1)}% του συνόλου
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(amount)}
                      </p>
                      <Badge className={getCategoryColor(category as ExpenseCategory)}>
                        {category}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <Progress
                    value={percentage}
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart Visualization */}
        {showChart && sortedCategories.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Γραφική Αναπαράσταση</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie Chart Representation */}
              <div className="space-y-3">
                <h4 className="font-medium">Κατανομή Ποσοστών</h4>
                <div className="space-y-2">
                  {sortedCategories.map(([category, amount]) => {
                    const percentage = breakdown.total ? (amount / breakdown.total) * 100 : 0;
                    return (
                      <div key={category} className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: getCategoryColor(category as ExpenseCategory).includes('blue') ? '#3B82F6' :
                                           getCategoryColor(category as ExpenseCategory).includes('cyan') ? '#06B6D4' :
                                           getCategoryColor(category as ExpenseCategory).includes('orange') ? '#F97316' :
                                           getCategoryColor(category as ExpenseCategory).includes('green') ? '#10B981' :
                                           getCategoryColor(category as ExpenseCategory).includes('purple') ? '#8B5CF6' :
                                           getCategoryColor(category as ExpenseCategory).includes('red') ? '#EF4444' :
                                           getCategoryColor(category as ExpenseCategory).includes('yellow') ? '#EAB308' : '#6B7280'
                          }}
                        />
                        <span className="text-sm flex-1">
                          {getCategoryLabel(category as ExpenseCategory)}
                        </span>
                        <span className="text-sm font-medium">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bar Chart Representation */}
              <div className="space-y-3">
                <h4 className="font-medium">Σύγκριση Ποσών</h4>
                <div className="space-y-2">
                  {sortedCategories.map(([category, amount]) => {
                    const percentage = breakdown.total ? (amount / breakdown.total) * 100 : 0;
                    const maxAmount = Math.max(...sortedCategories.map(([_, amt]) => amt));
                    const barWidth = maxAmount ? (amount / maxAmount) * 100 : 0;
                    
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate flex-1">
                            {getCategoryLabel(category as ExpenseCategory)}
                          </span>
                          <span className="font-medium ml-2">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: getCategoryColor(category as ExpenseCategory).includes('blue') ? '#3B82F6' :
                                             getCategoryColor(category as ExpenseCategory).includes('cyan') ? '#06B6D4' :
                                             getCategoryColor(category as ExpenseCategory).includes('orange') ? '#F97316' :
                                             getCategoryColor(category as ExpenseCategory).includes('green') ? '#10B981' :
                                             getCategoryColor(category as ExpenseCategory).includes('purple') ? '#8B5CF6' :
                                             getCategoryColor(category as ExpenseCategory).includes('red') ? '#EF4444' :
                                             getCategoryColor(category as ExpenseCategory).includes('yellow') ? '#EAB308' : '#6B7280'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Expenses */}
        {expenses && expenses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Πρόσφατες Δαπάνες</h3>
            <div className="space-y-2">
              {expenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((expense) => (
                  <div
                    key={expense.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <span className="font-medium">{expense.title || 'Χωρίς τίτλο'}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {formatDate(expense.date)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(expense.amount)}</div>
                      <div className="flex gap-2 justify-end mt-1">
                        <Badge 
                          variant="outline" 
                          className={getCategoryColor(expense.category as ExpenseCategory)}
                        >
                          {getCategoryLabel(expense.category as ExpenseCategory)}
                        </Badge>
                        {expense.payer_responsibility && (
                          <Badge 
                            variant="outline"
                            className={
                              expense.payer_responsibility === 'owner' 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : expense.payer_responsibility === 'resident'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }
                          >
                            {expense.payer_responsibility === 'owner' 
                              ? 'Δ' 
                              : expense.payer_responsibility === 'resident'
                              ? 'Ε'
                              : 'Κ'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 