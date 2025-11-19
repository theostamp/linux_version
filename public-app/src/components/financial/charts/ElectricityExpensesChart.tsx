import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { useExpenses } from '@/hooks/useExpensesQuery';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { useBuilding } from '@/components/contexts/BuildingContext';

interface ElectricityExpensesChartProps {
  year?: string;
  compareYear?: string;
  showComparison?: boolean;
  chartType?: 'line' | 'bar' | 'area';
  height?: number;
}

const monthsInGreek = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
];

export const ElectricityExpensesChart: React.FC<ElectricityExpensesChartProps> = ({
  year = new Date().getFullYear().toString(),
  compareYear,
  showComparison = false,
  chartType = 'bar',
  height = 400,
}) => {
  // Use BuildingContext instead of props
  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id;
  
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Fetch electricity expenses for the year
  const { data: expenses, isLoading } = useExpenses({
    building_id: buildingId,
    expense_date_after: startDate,
    expense_date_before: endDate,
  });

  // Fetch comparison year expenses if needed
  const { data: compareExpenses } = useExpenses({
    building_id: buildingId,
    expense_date_after: compareYear ? `${compareYear}-01-01` : startDate,
    expense_date_before: compareYear ? `${compareYear}-12-31` : endDate,
  }, {
    enabled: showComparison && !!compareYear
  });

  const chartData = useMemo(() => {
    if (!expenses) return [];

    // Debug: Log first few expenses to see their structure
    if (expenses.length > 0) {
      console.log('[ElectricityChart] Sample expenses:', expenses.slice(0, 3).map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        distribution_type: e.distribution_type,
        expense_type: e.expense_type,
        expense_date: e.expense_date,
        date: e.date,
      })));
    }

    // Filter for electricity expenses
    const electricityExpenses = expenses.filter(e => {
      const distributionType = e.distribution_type || '';
      const titleLower = (e.title || '').toLowerCase();
      const descLower = (e.description || '').toLowerCase();
      
      const isElectricity = e.category === 'electricity' ||
                            e.category === 'electricity_common' ||
                            e.category === 'utilities' ||
                            // Αν είναι Χιλιοστά (by_participation_mills) και έχει keywords ηλεκτρικού
                            (distributionType === 'by_participation_mills' && (titleLower.includes('δεη') || titleLower.includes('ρεύμα') || titleLower.includes('ηλεκτρ'))) ||
                            titleLower.includes('ρεύμα') ||
                            titleLower.includes('δεη') ||
                            titleLower.includes('ηλεκτρ') ||
                            titleLower.includes('ρευμα') ||
                            descLower.includes('ρεύμα') ||
                            descLower.includes('δεη') ||
                            descLower.includes('ηλεκτρ');

      // Exclude heating expenses
      const isHeating = (e.title && e.title.toLowerCase().includes('θέρμανσ')) ||
                        (e.title && e.title.toLowerCase().includes('πετρέλαιο')) ||
                        e.category === 'heating' ||
                        e.category === 'heating_fuel' ||
                        e.category === 'heating_gas' ||
                        e.category === 'heating_maintenance' ||
                        e.category === 'heating_repair' ||
                        e.category === 'heating_inspection' ||
                        e.category === 'heating_modernization';

      const result = isElectricity && !isHeating;
      
      // Debug: Log expenses that match electricity criteria
      if (result && distributionType === 'by_participation_mills') {
        console.log('[ElectricityChart] Matched by_participation_mills expense:', {
          id: e.id,
          title: e.title,
          distribution_type: distributionType,
          category: e.category,
        });
      }

      return result;
    });

    console.log('[ElectricityChart] Filtered electricity expenses:', {
      total: expenses.length,
      electricity: electricityExpenses.length,
      with_by_participation_mills: electricityExpenses.filter(e => e.distribution_type === 'by_participation_mills').length,
    });

    // Group by month
    const monthlyData = monthsInGreek.map((monthName, index) => {
      const monthNumber = (index + 1).toString().padStart(2, '0');
      const monthExpenses = electricityExpenses.filter(e => {
        // Support both e.date and e.expense_date fields
        const expenseDate = e.date || e.expense_date || '';
        return expenseDate && expenseDate.startsWith(`${year}-${monthNumber}`);
      });

      const commonAreas = monthExpenses
        .filter(e => !e.description || !e.description.toLowerCase().includes('ανελκυστ'))
        .reduce((sum, e) => sum + (typeof e.amount === 'string' ? parseFloat(e.amount) || 0 : e.amount || 0), 0);

      const elevator = monthExpenses
        .filter(e => e.category === 'elevator_maintenance' ||
                    e.category === 'elevator_repair' ||
                    e.category === 'elevator_inspection' ||
                    e.category === 'elevator_modernization' ||
                    (e.description && e.description.toLowerCase().includes('ανελκυστ')))
        .reduce((sum, e) => sum + (typeof e.amount === 'string' ? parseFloat(e.amount) || 0 : e.amount || 0), 0);

      // Add comparison data if available
      let compareCommonAreas = 0;
      let compareElevator = 0;

      if (showComparison && compareExpenses && compareYear) {
        const compareMonthNumber = (index + 1).toString().padStart(2, '0');
        const compareMonthExpenses = compareExpenses.filter(e => {
          // Support both e.date and e.expense_date fields
          const expenseDate = e.date || e.expense_date || '';
          return expenseDate && expenseDate.startsWith(`${compareYear}-${compareMonthNumber}`);
        });

        compareCommonAreas = compareMonthExpenses
          .filter(e => !e.description || !e.description.toLowerCase().includes('ανελκυστ'))
          .reduce((sum, e) => sum + (typeof e.amount === 'string' ? parseFloat(e.amount) || 0 : e.amount || 0), 0);

        compareElevator = compareMonthExpenses
          .filter(e => e.category === 'elevator_maintenance' ||
                      e.category === 'elevator_repair' ||
                      e.category === 'elevator_inspection' ||
                      e.category === 'elevator_modernization' ||
                      (e.description && e.description.toLowerCase().includes('ανελκυστ')))
          .reduce((sum, e) => sum + (typeof e.amount === 'string' ? parseFloat(e.amount) || 0 : e.amount || 0), 0);
      }

      return {
        month: monthName.substring(0, 3),
        fullMonth: monthName,
        commonAreas,
        elevator,
        total: commonAreas + elevator,
        expenseCount: monthExpenses.length,
        compareCommonAreas,
        compareElevator,
        compareTotal: compareCommonAreas + compareElevator,
      };
    });

    return monthlyData;
  }, [expenses, compareExpenses, year, compareYear, showComparison]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Φόρτωση δεδομένων ηλεκτρικού ρεύματος...</div>
      </div>
    );
  }

  // Debug: Log data to see what we have
  console.log('Electricity Chart Data:', {
    expenses: expenses?.length || 0,
    electricityExpenses: chartData.filter(d => d.total > 0),
    year
  });

  const hasData = chartData.some(d => d.total > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <span className="text-lg mb-2">⚡</span>
        <span>Δεν υπάρχουν δαπάνες ηλεκτρικού ρεύματος για το {year}</span>
      </div>
    );
  }

  const ChartComponent = chartType === 'bar' ? BarChart : LineChart;

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Δαπάνες Ηλεκτρικού Ρεύματος
        </h3>
        <p className="text-sm text-gray-600">
          Έτος: {year}
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
            <Label value="Ποσό (€)" angle={-90} position="insideLeft" />
          </YAxis>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                    <p className="font-semibold">{data.fullMonth} {year}</p>
                    <p className="text-blue-600">Κοινόχρηστα: €{data.commonAreas.toFixed(2)}</p>
                    <p className="text-purple-600">Ανελκυστήρας: €{data.elevator.toFixed(2)}</p>
                    <p className="font-semibold text-gray-800 border-t pt-1 mt-1">
                      Σύνολο: €{data.total.toFixed(2)}
                    </p>
                    {data.expenseCount > 0 && (
                      <p className="text-gray-500 text-xs mt-1">
                        Καταχωρήσεις: {data.expenseCount}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          {chartType === 'bar' ? (
            <>
              <Bar
                dataKey="commonAreas"
                stackId="a"
                fill="#3B82F6"
                name={`Κοινόχρηστα ${year}`}
              />
              <Bar
                dataKey="elevator"
                stackId="a"
                fill="#8B5CF6"
                name={`Ανελκυστήρας ${year}`}
              />
              {showComparison && compareYear && (
                <>
                  <Bar
                    dataKey="compareCommonAreas"
                    stackId="b"
                    fill="#F97316"
                    name={`Κοινόχρηστα ${compareYear}`}
                    opacity={0.7}
                  />
                  <Bar
                    dataKey="compareElevator"
                    stackId="b"
                    fill="#EF4444"
                    name={`Ανελκυστήρας ${compareYear}`}
                    opacity={0.7}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <Line
                type="monotone"
                dataKey="commonAreas"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Κοινόχρηστα"
              />
              <Line
                type="monotone"
                dataKey="elevator"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="Ανελκυστήρας"
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Σύνολο"
              />
            </>
          )}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Summary Statistics */}
      <div className="mt-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm text-blue-600">Κοινόχρηστα {year}</div>
            <div className="text-xl font-semibold text-blue-800">
              €{chartData.reduce((sum, d) => sum + d.commonAreas, 0).toFixed(2)}
            </div>
            {showComparison && compareYear && (
              <div className="text-sm text-orange-600 mt-1">
                {compareYear}: €{chartData.reduce((sum, d) => sum + d.compareCommonAreas, 0).toFixed(2)}
              </div>
            )}
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-sm text-purple-600">Ανελκυστήρας {year}</div>
            <div className="text-xl font-semibold text-purple-800">
              €{chartData.reduce((sum, d) => sum + d.elevator, 0).toFixed(2)}
            </div>
            {showComparison && compareYear && (
              <div className="text-sm text-red-600 mt-1">
                {compareYear}: €{chartData.reduce((sum, d) => sum + d.compareElevator, 0).toFixed(2)}
              </div>
            )}
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-green-600">Σύνολο {year}</div>
            <div className="text-xl font-semibold text-green-800">
              €{chartData.reduce((sum, d) => sum + d.total, 0).toFixed(2)}
            </div>
            {showComparison && compareYear && (
              <div className="text-sm text-red-600 mt-1">
                {compareYear}: €{chartData.reduce((sum, d) => sum + d.compareTotal, 0).toFixed(2)}
              </div>
            )}
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-600">Μ.Ό./Μήνα {year}</div>
            <div className="text-xl font-semibold text-gray-800">
              €{(chartData.reduce((sum, d) => sum + d.total, 0) / 12).toFixed(2)}
            </div>
            {showComparison && compareYear && (
              <div className="text-sm text-gray-600 mt-1">
                {compareYear}: €{(chartData.reduce((sum, d) => sum + d.compareTotal, 0) / 12).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Comparison Analysis */}
        {showComparison && compareYear && (
          <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
            <div className="text-sm font-medium text-yellow-800 mb-2">📊 Ανάλυση Σύγκρισης {year} vs {compareYear}</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Διαφορά Κοινοχρήστων:</span>
                <span className={`ml-2 font-medium ${
                  chartData.reduce((sum, d) => sum + d.commonAreas, 0) >
                  chartData.reduce((sum, d) => sum + d.compareCommonAreas, 0)
                    ? 'text-red-600' : 'text-green-600'
                }`}>
                  {((chartData.reduce((sum, d) => sum + d.commonAreas, 0) -
                    chartData.reduce((sum, d) => sum + d.compareCommonAreas, 0)) /
                    Math.max(1, chartData.reduce((sum, d) => sum + d.compareCommonAreas, 0)) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Διαφορά Ανελκυστήρα:</span>
                <span className={`ml-2 font-medium ${
                  chartData.reduce((sum, d) => sum + d.elevator, 0) >
                  chartData.reduce((sum, d) => sum + d.compareElevator, 0)
                    ? 'text-red-600' : 'text-green-600'
                }`}>
                  {((chartData.reduce((sum, d) => sum + d.elevator, 0) -
                    chartData.reduce((sum, d) => sum + d.compareElevator, 0)) /
                    Math.max(1, chartData.reduce((sum, d) => sum + d.compareElevator, 0)) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Συνολική Διαφορά:</span>
                <span className={`ml-2 font-medium ${
                  chartData.reduce((sum, d) => sum + d.total, 0) >
                  chartData.reduce((sum, d) => sum + d.compareTotal, 0)
                    ? 'text-red-600' : 'text-green-600'
                }`}>
                  {((chartData.reduce((sum, d) => sum + d.total, 0) -
                    chartData.reduce((sum, d) => sum + d.compareTotal, 0)) /
                    Math.max(1, chartData.reduce((sum, d) => sum + d.compareTotal, 0)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Monthly peak */}
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <div className="text-sm text-blue-800">
            <strong>Μήνας με υψηλότερη κατανάλωση {year}:</strong>{' '}
            {(() => {
              const maxMonth = chartData.reduce((max, d) =>
                d.total > max.total ? d : max
              , chartData[0]);
              return `${maxMonth.fullMonth} (€${maxMonth.total.toFixed(2)})`;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

