'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  Building2, 
  Users, 
  Thermometer,
  ArrowUpDown,
  Package,
  Target,
  TrendingUp,
  Eye,
  ChevronRight
} from 'lucide-react';

interface ExpenseData {
  category: string;
  amount: number;
  description: string;
  apartments_affected?: number;
}

interface ExpenseAnalysisWidgetProps {
  expenses: ExpenseData[];
  totalAmount: number;
  apartmentsCount: number;
  buildingName?: string;
  period?: string;
  onViewDetails?: () => void;
  onOpenFullAnalysis?: () => void;
}

// Colors and labels for expense categories
const CATEGORY_CONFIG = {
  'general_expenses': {
    label: 'Γενικές Δαπάνες',
    color: '#3B82F6',
    icon: Building2
  },
  'elevator_expenses': {
    label: 'Ανελκυστήρας',
    color: '#10B981',
    icon: ArrowUpDown
  },
  'heating_expenses': {
    label: 'Θέρμανση',
    color: '#F59E0B',
    icon: Thermometer
  },
  'equal_share_expenses': {
    label: 'Ισόποσες Δαπάνες',
    color: '#8B5CF6',
    icon: Users
  },
  'individual_expenses': {
    label: 'Ατομικές Δαπάνες',
    color: '#EF4444',
    icon: Package
  },
  'reserve_fund_contribution': {
    label: 'Εισφορά Αποθεματικού',
    color: '#6B7280',
    icon: Target
  }
};

export const ExpenseAnalysisWidget: React.FC<ExpenseAnalysisWidgetProps> = ({
  expenses,
  totalAmount,
  apartmentsCount,
  buildingName = 'Άγνωστο Κτίριο',
  period,
  onViewDetails,
  onOpenFullAnalysis
}) => {
  const [activeView, setActiveView] = useState<'chart' | 'breakdown'>('chart');

  // Group expenses by category and calculate totals
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    expenses.forEach(expense => {
      if (!totals[expense.category]) {
        totals[expense.category] = 0;
      }
      totals[expense.category] += expense.amount;
    });

    return totals;
  }, [expenses]);

  // Prepare data for pie chart
  const chartData = useMemo(() => {
    return Object.entries(categoryTotals)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => {
        const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
        return {
          name: config?.label || category,
          value: amount,
          percentage: totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0',
          color: config?.color || '#6B7280'
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [categoryTotals, totalAmount]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {formatCurrency(data.value)} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <TrendingUp className="h-6 w-6 text-indigo-600" />
            <span>Ανάλυση Δαπανών</span>
            {period && (
              <Badge variant="outline" className="text-indigo-700 border-indigo-300">
                {period}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-indigo-600">
              {formatCurrency(totalAmount)}
            </Badge>
            {onOpenFullAnalysis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenFullAnalysis}
                className="text-indigo-600 hover:text-indigo-700"
              >
                <Eye className="h-4 w-4 mr-1" />
                Πλήρης Ανάλυση
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={activeView === 'chart' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('chart')}
            className="flex-1"
          >
            Γραφική Αναπαράσταση
          </Button>
          <Button
            variant={activeView === 'breakdown' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('breakdown')}
            className="flex-1"
          >
            Κατηγορίες
          </Button>
        </div>

        {activeView === 'chart' ? (
          <div className="space-y-4">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2">
              {chartData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-gray-700 truncate">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(categoryTotals)
              .filter(([_, amount]) => amount > 0)
              .sort(([_a, amountA], [_b, amountB]) => amountB - amountA)
              .map(([category, amount]) => {
                const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                const IconComponent = config?.icon || Package;
                const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100) : 0;
                
                return (
                  <div key={category} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <IconComponent 
                        className="h-5 w-5" 
                        style={{ color: config?.color || '#6B7280' }}
                      />
                      <div>
                        <p className="font-medium text-sm">
                          {config?.label || category}
                        </p>
                        <p className="text-xs text-gray-600">
                          {percentage.toFixed(1)}% του συνόλου
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(amount)}</p>
                      <p className="text-xs text-gray-600">
                        {apartmentsCount > 0 ? formatCurrency(amount / apartmentsCount) : '0,00 €'}/διαμ.
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Summary Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600">Κτίριο</p>
              <p className="font-medium text-sm truncate">{buildingName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Διαμερίσματα</p>
              <p className="font-medium text-sm">{apartmentsCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Μέσος όρος/διαμ.</p>
              <p className="font-medium text-sm">
                {apartmentsCount > 0 ? formatCurrency(totalAmount / apartmentsCount) : '0,00 €'}
              </p>
            </div>
          </div>
        </div>

        {onViewDetails && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              Προβολή Λεπτομερειών
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
