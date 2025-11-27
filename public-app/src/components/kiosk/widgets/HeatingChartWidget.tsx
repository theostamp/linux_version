'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Flame } from 'lucide-react';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface HeatingChartWidgetProps extends BaseWidgetProps {
  buildingId?: number | null;
}

// Heating season months: September to May (9 months)
const HEATING_MONTHS = ['Σεπ', 'Οκτ', 'Νοε', 'Δεκ', 'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαι'];

export default function HeatingChartWidget({ data, isLoading, error, buildingId }: HeatingChartWidgetProps) {
  const heatingPeriod = data?.financial?.heating_period;

  // Get expenses from data prop (from useKioskData hook) - already filtered by backend
  const expenses = useMemo(() => {
    const expensesData = data?.financial?.heating_expenses || [];
    return expensesData;
  }, [data]);

  // Build chart data with ALL heating months (Sep-May), filling gaps with 0
  const chartData = useMemo(() => {
    // Group expenses by month
    const grouped = new Map<string, number>();

    expenses.forEach((expense: any) => {
      const rawDate = expense.date || expense.expense_date;
      if (!rawDate) return;

      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) return;

      // Get short month name in Greek
      const monthLabel = format(parsedDate, 'MMM', { locale: el });
      const amountValue = parseFloat(expense.amount) || 0;

      const existing = grouped.get(monthLabel) || 0;
      grouped.set(monthLabel, existing + amountValue);
    });

    // Build complete heating season with all months
    return HEATING_MONTHS.map(month => ({
      month,
      amount: Number((grouped.get(month) || 0).toFixed(2)),
    }));
  }, [expenses]);

  const seasonLabel = useMemo(() => {
    if (heatingPeriod?.season_label) {
      return heatingPeriod.season_label.replace('-', ' - ');
    }

    if (heatingPeriod?.start && heatingPeriod?.end) {
      try {
        const startYear = new Date(heatingPeriod.start).getFullYear();
        const endYear = new Date(heatingPeriod.end).getFullYear();
        return `${startYear} - ${endYear}`;
      } catch {
        return '';
      }
    }

    return '';
  }, [heatingPeriod]);

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

  const totalAmount = chartData.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-orange-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Κατανάλωση Θέρμανσης</h3>
          </div>
          {seasonLabel && (
            <span className="text-xs text-orange-300/70">{seasonLabel}</span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-orange-200/80">Συνολική Δαπάνη</span>
          <span className="text-lg font-bold text-white">€{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Chart - Full height with all heating months */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#9CA3AF', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 8 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(251, 146, 60, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`€${value.toFixed(2)}`, 'Δαπάνη']}
            />
            <Bar 
              dataKey="amount" 
              fill="#F97316" 
              radius={[3, 3, 0, 0]}
              stroke="#FB923C"
              strokeWidth={0.5}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

