'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Flame, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface HeatingChartWidgetProps extends BaseWidgetProps {
  buildingId?: number | null;
}

export default function HeatingChartWidget({ data, isLoading, error, buildingId }: HeatingChartWidgetProps) {
  const heatingPeriod = data?.financial?.heating_period;

  // Get expenses from data prop (from useKioskData hook) - already filtered by backend
  const expenses = useMemo(() => {
    const expensesData = data?.financial?.heating_expenses || [];
    console.log('[HeatingChartWidget] Heating expenses data:', {
      count: expensesData.length,
      expenses: expensesData,
      financial: data?.financial,
      heatingPeriod,
    });
    return expensesData;
  }, [data, heatingPeriod]);

  const chartData = useMemo(() => {
    const grouped = new Map<
      string,
      {
        label: string;
        amount: number;
        count: number;
      }
    >();

    expenses.forEach((expense: any) => {
      const rawDate = expense.date || expense.expense_date;
      if (!rawDate) return;

      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) return;

      const monthKey = format(parsedDate, 'yyyy-MM');
      const label = format(parsedDate, 'MMM yy', { locale: el });
      const amountValue = parseFloat(expense.amount) || 0;

      const existing = grouped.get(monthKey);
      if (existing) {
        existing.amount += amountValue;
        existing.count += 1;
      } else {
        grouped.set(monthKey, {
          label,
          amount: amountValue,
          count: 1,
        });
      }
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([, value]) => ({
        month: value.label,
        amount: Number(value.amount.toFixed(2)),
        count: value.count,
      }));
  }, [expenses]);

  const seasonLabel = useMemo(() => {
    if (heatingPeriod?.season_label) {
      return heatingPeriod.season_label.replace('-', ' - ');
    }

    if (heatingPeriod?.start && heatingPeriod?.end) {
      try {
        const startLabel = format(new Date(heatingPeriod.start), 'MMM yyyy', { locale: el });
        const endLabel = format(new Date(heatingPeriod.end), 'MMM yyyy', { locale: el });
        return `${startLabel} - ${endLabel}`;
      } catch {
        return 'Περίοδος Θέρμανσης';
      }
    }

    return 'Περίοδος Θέρμανσης';
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

  const hasData = chartData.some(d => d.amount > 0);
  const totalAmount = chartData.reduce((sum, d) => sum + d.amount, 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full text-orange-200/50">
        <div className="text-center">
          <Flame className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Δεν υπάρχουν δαπάνες θέρμανσης</p>
          {seasonLabel && (
            <p className="text-xs mt-1">{seasonLabel}</p>
          )}
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
            {seasonLabel}
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
        {heatingPeriod?.is_fallback && (
          <p className="text-[10px] uppercase tracking-wide text-orange-200/70 mt-1">
            Εμφανίζονται τα πιο πρόσφατα διαθέσιμα στοιχεία
          </p>
        )}
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

