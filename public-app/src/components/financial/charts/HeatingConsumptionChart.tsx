import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { useExpenses } from '@/hooks/useExpensesQuery';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface HeatingConsumptionChartProps {
  buildingId: number;
  heatingYear?: string; // Format: "2025" for 2025-2026 heating season
  compareYear?: string; // Year to compare with
  showComparison?: boolean;
  chartType?: 'line' | 'bar';
  height?: number;
}

// Helper function to get heating season months (September to May)
const getHeatingSeasonMonths = (year: string) => {
  const startYear = parseInt(year);
  const endYear = startYear + 1;

  const months = [];
  // September to December of start year
  for (let month = 9; month <= 12; month++) {
    months.push({
      date: `${startYear}-${month.toString().padStart(2, '0')}`,
      label: format(new Date(startYear, month - 1), 'MMM', { locale: el }),
      fullLabel: format(new Date(startYear, month - 1), 'MMMM yyyy', { locale: el })
    });
  }
  // January to May of end year
  for (let month = 1; month <= 5; month++) {
    months.push({
      date: `${endYear}-${month.toString().padStart(2, '0')}`,
      label: format(new Date(endYear, month - 1), 'MMM', { locale: el }),
      fullLabel: format(new Date(endYear, month - 1), 'MMMM yyyy', { locale: el })
    });
  }

  return months;
};

export const HeatingConsumptionChart: React.FC<HeatingConsumptionChartProps> = ({
  buildingId,
  heatingYear = new Date().getFullYear().toString(),
  compareYear,
  showComparison = false,
  chartType = 'bar',
  height = 400,
}) => {
  const months = getHeatingSeasonMonths(heatingYear);
  const startDate = months[0].date + '-01';
  const endDate = months[months.length - 1].date + '-31';

  // Comparison period
  const compareMonths = compareYear ? getHeatingSeasonMonths(compareYear) : [];
  const compareStartDate = compareMonths.length > 0 ? compareMonths[0].date + '-01' : '';
  const compareEndDate = compareMonths.length > 0 ? compareMonths[compareMonths.length - 1].date + '-31' : '';

  // Fetch heating expenses for the heating season
  const { data: expenses, isLoading: expensesLoading } = useExpenses({
    building_id: buildingId,
    expense_date_after: startDate,
    expense_date_before: endDate,
  });

  // Fetch comparison data if needed
  const { data: compareExpenses } = useExpenses({
    building_id: buildingId,
    expense_date_after: compareStartDate,
    expense_date_before: compareEndDate,
  }, {
    enabled: showComparison && !!compareYear
  });

  const chartData = useMemo(() => {
    if (!expenses) return [];

    return months.map(month => {
      // Find heating expenses for this month
      const heatingExpenses = expenses.filter(e => {
        const titleLower = e.title?.toLowerCase() || '';
        const descLower = (e as any).description?.toLowerCase() || '';
        const categoryLower = e.category?.toLowerCase() || '';

        const isHeating = (e as any).expense_type === 'heating' ||
                          (e as any).expense_type === 'Μετρητές' ||
                          e.category === 'heating_fuel' ||
                          e.category === 'heating_gas' ||
                          e.category === 'heating_maintenance' ||
                          e.category === 'heating_repair' ||
                          e.category === 'heating_inspection' ||
                          e.category === 'heating_modernization' ||
                          categoryLower === 'heating' ||
                          categoryLower === 'heating_fuel' ||
                          categoryLower === 'heating_gas' ||
                          categoryLower === 'heating_maintenance' ||
                          categoryLower === 'heating_repair' ||
                          categoryLower === 'heating_inspection' ||
                          categoryLower === 'heating_modernization' ||
                          categoryLower === 'utilities' ||
                          categoryLower === 'meters' ||
                          categoryLower === 'μετρητές' ||
                          titleLower.includes('θέρμανσ') ||
                          titleLower.includes('θερμανσ') ||
                          titleLower.includes('πετρέλαιο') ||
                          titleLower.includes('πετρελαιο') ||
                          titleLower.includes('φυσικό αέριο') ||
                          titleLower.includes('φυσικο αεριο') ||
                          titleLower.includes('αέριο') ||
                          titleLower.includes('gas') ||
                          titleLower.includes('natural gas') ||
                          titleLower.includes('καυστήρας') ||
                          titleLower.includes('καυστηρας') ||
                          titleLower.includes('θερμαντικό') ||
                          titleLower.includes('θερμαντικο') ||
                          descLower.includes('θέρμανσ') ||
                          descLower.includes('πετρέλαιο') ||
                          descLower.includes('φυσικό αέριο') ||
                          descLower.includes('καυστήρας') ||
                          descLower.includes('θερμαντικό');

        // Check if expense is in this month (month.date is like "2024-09")
        const expenseInMonth = e.date && e.date.startsWith(month.date);

        return isHeating && expenseInMonth;
      });

      const totalExpense = heatingExpenses.reduce((sum, expense) =>
        sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) || 0 : expense.amount || 0), 0
      );

      // Add comparison data if available
      let compareExpense = 0;

      if (showComparison && compareExpenses) {
        const compareMonth = compareMonths.find(cm => cm.label === month.label);
        if (compareMonth) {
          const compareHeatingExpenses = compareExpenses.filter(e => {
            const titleLower = e.title?.toLowerCase() || '';
            const descLower = (e as any).description?.toLowerCase() || '';
            const categoryLower = e.category?.toLowerCase() || '';

            const isHeating = (e as any).expense_type === 'heating' ||
                              (e as any).expense_type === 'Μετρητές' ||
                              e.category === 'heating_fuel' ||
                              e.category === 'heating_gas' ||
                              e.category === 'heating_maintenance' ||
                              e.category === 'heating_repair' ||
                              e.category === 'heating_inspection' ||
                              e.category === 'heating_modernization' ||
                              categoryLower === 'heating' ||
                              categoryLower === 'heating_fuel' ||
                              categoryLower === 'heating_gas' ||
                              categoryLower === 'heating_maintenance' ||
                              categoryLower === 'heating_repair' ||
                              categoryLower === 'heating_inspection' ||
                              categoryLower === 'heating_modernization' ||
                              categoryLower === 'utilities' ||
                              categoryLower === 'meters' ||
                              categoryLower === 'μετρητές' ||
                              titleLower.includes('θέρμανσ') ||
                              titleLower.includes('θερμανσ') ||
                              titleLower.includes('πετρέλαιο') ||
                              titleLower.includes('πετρελαιο') ||
                              titleLower.includes('φυσικό αέριο') ||
                              titleLower.includes('φυσικο αεριο') ||
                              titleLower.includes('αέριο') ||
                              titleLower.includes('gas') ||
                              titleLower.includes('natural gas') ||
                              titleLower.includes('καυστήρας') ||
                              titleLower.includes('καυστηρας') ||
                              titleLower.includes('θερμαντικό') ||
                              titleLower.includes('θερμαντικο') ||
                              descLower.includes('θέρμανσ') ||
                              descLower.includes('πετρέλαιο') ||
                              descLower.includes('φυσικό αέριο') ||
                              descLower.includes('καυστήρας') ||
                              descLower.includes('θερμαντικό');
            return isHeating &&
                   e.date &&
                   e.date.startsWith(compareMonth.date);
          });

          compareExpense = compareHeatingExpenses.reduce((sum, expense) =>
            sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) || 0 : expense.amount || 0), 0
          );
        }
      }

      return {
        month: month.label,
        fullMonth: month.fullLabel,
        expense: totalExpense,
        expenseCount: heatingExpenses.length,
        compareExpense,
      };
    });
  }, [expenses, months, compareExpenses, compareMonths, showComparison]);

  if (expensesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Φόρτωση δεδομένων θέρμανσης...</div>
      </div>
    );
  }

  const hasData = chartData.some(d => d.expense > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <span className="text-lg mb-2">🔥</span>
        <span>Δεν υπάρχουν δαπάνες θέρμανσης για την περίοδο</span>
        <span className="text-sm mt-1">Σεπτέμβριος {heatingYear} - Μάιος {parseInt(heatingYear) + 1}</span>
        {expenses && expenses.length > 0 && (
          <span className="text-xs mt-2 text-yellow-600">
            Βρέθηκαν {expenses.length} δαπάνες αλλά καμία δεν αναγνωρίστηκε ως θέρμανση
          </span>
        )}
      </div>
    );
  }

  const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
  const DataComponent = chartType === 'bar' ? Bar : Line;

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Δαπάνες Θέρμανσης
        </h3>
        <p className="text-sm text-gray-600">
          Περίοδος: Σεπτέμβριος {heatingYear} - Μάιος {parseInt(heatingYear) + 1}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis>
            <Label value="Δαπάνη (€)" angle={-90} position="insideLeft" />
          </YAxis>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                    <p className="font-semibold">{data.fullMonth}</p>
                    <p className="text-green-600">Δαπάνη: €{data.expense.toFixed(2)}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Δαπάνες: {data.expenseCount}
                    </p>
                    {showComparison && compareYear && data.compareExpense > 0 && (
                      <p className="text-orange-600 text-sm">
                        {compareYear}-{parseInt(compareYear) + 1}: €{data.compareExpense.toFixed(2)}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <DataComponent
            type="monotone"
            dataKey="expense"
            stroke="#10B981"
            fill="#10B981"
            name={`Δαπάνη ${heatingYear}-${parseInt(heatingYear) + 1} (€)`}
            strokeWidth={chartType === 'line' ? 2 : undefined}
          />
          {showComparison && compareYear && (
            <DataComponent
              type="monotone"
              dataKey="compareExpense"
              stroke="#EF4444"
              fill="#EF4444"
              name={`Δαπάνη ${compareYear}-${parseInt(compareYear) + 1} (€)`}
              strokeWidth={chartType === 'line' ? 2 : undefined}
              opacity={0.7}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Summary Statistics */}
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-green-600">Συνολική Δαπάνη {heatingYear}-{parseInt(heatingYear) + 1}</div>
            <div className="text-xl font-semibold text-green-800">
              €{chartData.reduce((sum, d) => sum + d.expense, 0).toFixed(2)}
            </div>
            {showComparison && compareYear && (
              <div className="text-sm text-red-600 mt-1">
                {compareYear}-{parseInt(compareYear) + 1}: €{chartData.reduce((sum, d) => sum + d.compareExpense, 0).toFixed(2)}
              </div>
            )}
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-600">Μέσος Όρος/Μήνα</div>
            <div className="text-xl font-semibold text-gray-800">
              €{(chartData.reduce((sum, d) => sum + d.expense, 0) / 9).toFixed(2)}
            </div>
            {showComparison && compareYear && (
              <div className="text-sm text-gray-600 mt-1">
                {compareYear}-{parseInt(compareYear) + 1}: €{(chartData.reduce((sum, d) => sum + d.compareExpense, 0) / 9).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Comparison Analysis */}
        {showComparison && compareYear && (
          <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
            <div className="text-sm font-medium text-yellow-800 mb-2">📊 Ανάλυση Σύγκρισης</div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Διαφορά Κόστους:</span>
                <span className={`ml-2 font-medium ${
                  chartData.reduce((sum, d) => sum + d.expense, 0) >
                  chartData.reduce((sum, d) => sum + d.compareExpense, 0)
                    ? 'text-red-600' : 'text-green-600'
                }`}>
                  {((chartData.reduce((sum, d) => sum + d.expense, 0) -
                    chartData.reduce((sum, d) => sum + d.compareExpense, 0)) /
                    Math.max(1, chartData.reduce((sum, d) => sum + d.compareExpense, 0)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};