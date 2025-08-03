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

    const categoryTotals: Record<ExpenseCategory, number> = {
      [ExpenseCategory.ELECTRICITY]: 0,
      [ExpenseCategory.WATER]: 0,
      [ExpenseCategory.HEATING]: 0,
      [ExpenseCategory.CLEANING]: 0,
      [ExpenseCategory.MAINTENANCE]: 0,
      [ExpenseCategory.INSURANCE]: 0,
      [ExpenseCategory.ADMINISTRATION]: 0,
      [ExpenseCategory.OTHER]: 0,
    };

    filteredExpenses.forEach(expense => {
      categoryTotals[expense.category] += expense.amount;
    });

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return {
      categoryTotals,
      total,
      count: filteredExpenses.length,
      period,
    };
  }, [expenses, period]);

  const getCategoryLabel = (category: ExpenseCategory) => {
    const labels: Record<ExpenseCategory, string> = {
      [ExpenseCategory.ELECTRICITY]: 'Ηλεκτρισμός',
      [ExpenseCategory.WATER]: 'Νερό',
      [ExpenseCategory.HEATING]: 'Θέρμανση',
      [ExpenseCategory.CLEANING]: 'Καθαριότητα',
      [ExpenseCategory.MAINTENANCE]: 'Συντήρηση',
      [ExpenseCategory.INSURANCE]: 'Ασφάλεια',
      [ExpenseCategory.ADMINISTRATION]: 'Διοίκηση',
      [ExpenseCategory.OTHER]: 'Άλλο',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: ExpenseCategory) => {
    const colors: Record<ExpenseCategory, string> = {
      [ExpenseCategory.ELECTRICITY]: 'bg-blue-100 text-blue-800',
      [ExpenseCategory.WATER]: 'bg-cyan-100 text-cyan-800',
      [ExpenseCategory.HEATING]: 'bg-orange-100 text-orange-800',
      [ExpenseCategory.CLEANING]: 'bg-green-100 text-green-800',
      [ExpenseCategory.MAINTENANCE]: 'bg-purple-100 text-purple-800',
      [ExpenseCategory.INSURANCE]: 'bg-red-100 text-red-800',
      [ExpenseCategory.ADMINISTRATION]: 'bg-gray-100 text-gray-800',
      [ExpenseCategory.OTHER]: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: ExpenseCategory) => {
    const icons: Record<ExpenseCategory, string> = {
      [ExpenseCategory.ELECTRICITY]: '⚡',
      [ExpenseCategory.WATER]: '💧',
      [ExpenseCategory.HEATING]: '🔥',
      [ExpenseCategory.CLEANING]: '🧹',
      [ExpenseCategory.MAINTENANCE]: '🔧',
      [ExpenseCategory.INSURANCE]: '🛡️',
      [ExpenseCategory.ADMINISTRATION]: '📋',
      [ExpenseCategory.OTHER]: '📦',
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
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getCategoryIcon(expense.category)}</span>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {formatCurrency(expense.amount)}
                      </p>
                      <Badge className={getCategoryColor(expense.category)}>
                        {getCategoryLabel(expense.category)}
                      </Badge>
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