'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Flame, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface HeatingChartWidgetProps extends BaseWidgetProps {
  buildingId?: number | null;
}

export default function HeatingChartWidget({ data, isLoading, error, buildingId }: HeatingChartWidgetProps) {
  // Get current heating season (September to May)
  const getHeatingSeasonMonths = (year: number) => {
    const months = [];
    // September to December
    for (let month = 9; month <= 12; month++) {
      months.push({
        date: `${year}-${month.toString().padStart(2, '0')}`,
        label: new Date(year, month - 1).toLocaleDateString('el-GR', { month: 'short' }),
      });
    }
    // January to May
    for (let month = 1; month <= 5; month++) {
      months.push({
        date: `${year + 1}-${month.toString().padStart(2, '0')}`,
        label: new Date(year + 1, month - 1).toLocaleDateString('el-GR', { month: 'short' }),
      });
    }
    return months;
  };

  const currentYear = new Date().getFullYear();
  const heatingYear = new Date().getMonth() >= 8 ? currentYear : currentYear - 1; // If after August, use current year
  const months = useMemo(() => getHeatingSeasonMonths(heatingYear), [heatingYear]);

  // Get expenses from data prop (from useKioskData hook) - already filtered by backend
  const expenses = useMemo(() => {
    return data?.financial?.heating_expenses || [];
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-xl mb-2">⚠️</div>
          <p className="text-xs">Σφάλμα φόρτωσης δεδομένων</p>
        </div>
      </div>
    );
  }

  // Group expenses by month
  const chartData = months.map(month => {
    const monthExpenses = expenses.filter((exp: any) => {
      const expenseDate = exp.date || exp.expense_date || '';
      return expenseDate.startsWith(month.date);
    });
    const total = monthExpenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0);
    return {
      month: month.label,
      amount: total,
      count: monthExpenses.length,
    };
  });

  const hasData = chartData.some(d => d.amount > 0);
  const totalAmount = chartData.reduce((sum, d) => sum + d.amount, 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full text-orange-200/50">
        <div className="text-center">
          <Flame className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Δεν υπάρχουν δαπάνες θέρμανσης</p>
          <p className="text-xs mt-1">Περίοδος: Σεπ {heatingYear} - Μάι {heatingYear + 1}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-orange-500/20">
        <div className="flex items-center space-x-2">
          <Flame className="w-5 h-5 text-orange-300" />
          <h3 className="text-lg font-semibold text-white">Κατανάλωση Θέρμανσης</h3>
        </div>
        <div className="text-xs text-orange-300/70">
          {heatingYear}-{heatingYear + 1}
        </div>
      </div>

      {/* Total Summary */}
      <div className="mb-3 p-2 bg-gradient-to-br from-orange-600/20 to-orange-800/20 rounded-lg border border-orange-500/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-orange-200">Συνολική Δαπάνη</span>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-3 h-3 text-orange-300" />
            <span className="text-lg font-bold text-white">
              €{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(251, 146, 60, 0.3)',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number) => [`€${value.toFixed(2)}`, 'Δαπάνη']}
            />
            <Bar 
              dataKey="amount" 
              fill="#F97316" 
              radius={[4, 4, 0, 0]}
              stroke="#FB923C"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

