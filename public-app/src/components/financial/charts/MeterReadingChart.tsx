import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMeterReadings } from '../../../hooks/useMeterReadings';
import { MeterReading } from '../../../types/financial';

interface MeterReadingChartProps {
  apartmentId?: number;
  period?: 'month' | 'quarter' | 'year';
  chartType?: 'line' | 'bar' | 'consumption';
  height?: number;
}

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#0088FE',
];

export const MeterReadingChart: React.FC<MeterReadingChartProps> = ({
  apartmentId,
  period = 'month',
  chartType = 'line',
  height = 400,
}) => {
  const { readings: meterReadings, loading, error } = useMeterReadings();
  const [chartData, setChartData] = useState<any[]>([]);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);

  useEffect(() => {
    if (meterReadings && meterReadings.length > 0) {
      processChartData();
    }
  }, [meterReadings, apartmentId, period]);

  const processChartData = () => {
    if (!meterReadings) return;

    // Φιλτράρισμα ανά διαμέρισμα αν δοθεί apartmentId
    let filteredReadings = meterReadings;
    if (apartmentId) {
      filteredReadings = meterReadings.filter(
        (reading) => reading.apartment === apartmentId
      );
    }

    // Ομαδοποίηση ανά ημερομηνία και διαμέρισμα
    const groupedData = filteredReadings.reduce((acc, reading) => {
      const date = new Date(reading.reading_date);
      const dateKey = formatDate(date, period);

      if (!acc[dateKey]) {
        acc[dateKey] = {};
      }

      if (!acc[dateKey][reading.apartment_number || 'Unknown']) {
        acc[dateKey][reading.apartment_number || 'Unknown'] = {
          value: (reading as any).current_value,
          consumption: typeof reading.consumption === 'string' ? parseFloat(reading.consumption) || 0 : reading.consumption || 0,
        };
      }

      return acc;
    }, {} as Record<string, Record<string, { value: number; consumption: number }>>);

    // Μετατροπή σε format για το chart
    const lineChartData = Object.entries(groupedData).map(([date, apartments]) => {
      const dataPoint: any = { date };
      Object.entries(apartments).forEach(([apartmentName, data]) => {
        dataPoint[apartmentName] = data.value;
      });
      return dataPoint;
    });

    // Δεδομένα κατανάλωσης για bar chart
    const consumptionChartData = Object.entries(groupedData).map(([date, apartments]) => {
      const dataPoint: any = { date };
      Object.entries(apartments).forEach(([apartmentName, data]) => {
        dataPoint[apartmentName] = data.consumption;
      });
      return dataPoint;
    });

    setChartData(lineChartData);
    setConsumptionData(consumptionChartData);
  };

  const formatDate = (date: Date, period: string): string => {
    switch (period) {
      case 'month':
        return date.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' });
      case 'quarter':
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `Q${quarter} ${date.getFullYear()}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('el-GR');
    }
  };

  const getApartmentNames = (): string[] => {
    if (!meterReadings) return [];
    const names = new Set(meterReadings.map(reading => reading.apartment_number || 'Unknown'));
    return Array.from(names);
  };

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          label={{ value: 'Μετρήσεις', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: any, name: string) => [value, name]}
          labelFormatter={(label) => `Ημερομηνία: ${label}`}
        />
        <Legend />
        {getApartmentNames().map((apartmentName, index) => (
          <Line
            key={apartmentName}
            type="monotone"
            dataKey={apartmentName}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          label={{ value: 'Μετρήσεις', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: any, name: string) => [value, name]}
          labelFormatter={(label) => `Ημερομηνία: ${label}`}
        />
        <Legend />
        {getApartmentNames().map((apartmentName, index) => (
          <Bar
            key={apartmentName}
            dataKey={apartmentName}
            fill={COLORS[index % COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderConsumptionChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={consumptionData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          label={{ value: 'Κατανάλωση', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: any, name: string) => [value, name]}
          labelFormatter={(label) => `Ημερομηνία: ${label}`}
        />
        <Legend />
        {getApartmentNames().map((apartmentName, index) => (
          <Bar
            key={apartmentName}
            dataKey={apartmentName}
            fill={COLORS[index % COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Φόρτωση δεδομένων...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">
          <p>Σφάλμα κατά τη φόρτωση δεδομένων:</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-center">
          <p>Δεν υπάρχουν δεδομένα μετρήσεων</p>
          <p className="text-sm">Προσθέστε μετρήσεις για να δείτε τα γραφήματα</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Γράφημα Μετρήσεων
        </h3>
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
          <span>Διαμέρισμα: {apartmentId ? `#${apartmentId}` : 'Όλα'}</span>
          <span>•</span>
          <span>Περίοδος: {period === 'month' ? 'Μηνιαία' : period === 'quarter' ? 'Τριμηνιαία' : 'Ετήσια'}</span>
          <span>•</span>
          <span>Τύπος: {chartType === 'line' ? 'Γραμμικό' : chartType === 'bar' ? 'Ράβδων' : 'Κατανάλωση'}</span>
        </div>
      </div>

      <div className="chart-container">
        {chartType === 'line' && renderLineChart()}
        {chartType === 'bar' && renderBarChart()}
        {chartType === 'consumption' && renderConsumptionChart()}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Συνολικές μετρήσεις: {meterReadings?.length || 0}</p>
        <p>Διαμερίσματα: {getApartmentNames().length}</p>
      </div>
    </div>
  );
};
