import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { useMeterReadings } from '../../../hooks/useMeterReadings';

interface ConsumptionChartProps {
  chartType?: 'bar' | 'pie' | 'line';
  period?: 'month' | 'quarter' | 'year';
  height?: number;
  showTrends?: boolean;
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

export const ConsumptionChart: React.FC<ConsumptionChartProps> = ({
  chartType = 'bar',
  period = 'month',
  height = 400,
  showTrends = false,
}) => {
  const { readings: meterReadings, loading, error } = useMeterReadings();
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    if (meterReadings && meterReadings.length > 0) {
      processConsumptionData();
    }
  }, [meterReadings, period]);

  const processConsumptionData = () => {
    if (!meterReadings) return;

    // Ομαδοποίηση ανά διαμέρισμα και περίοδο
    const apartmentConsumption = meterReadings.reduce((acc, reading) => {
      const apartmentName = reading.apartment_number || 'Unknown';
      const date = new Date(reading.reading_date);
      const periodKey = formatDate(date, period);
      const consumption = typeof reading.consumption === 'string' ? parseFloat(reading.consumption) || 0 : reading.consumption || 0;

      if (!acc[apartmentName]) {
        acc[apartmentName] = {};
      }

      if (!acc[apartmentName][periodKey]) {
        acc[apartmentName][periodKey] = 0;
      }

      acc[apartmentName][periodKey] += consumption;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Μετατροπή σε format για bar chart
    const periods = new Set<string>();
    Object.values(apartmentConsumption).forEach(apartmentData => {
      Object.keys(apartmentData).forEach(period => periods.add(period));
    });

    const sortedPeriods = Array.from(periods).sort();
    const barChartData = sortedPeriods.map(periodKey => {
      const dataPoint: any = { period: periodKey };
      Object.entries(apartmentConsumption).forEach(([apartmentName, periodData]) => {
        dataPoint[apartmentName] = periodData[periodKey] || 0;
      });
      return dataPoint;
    });

    // Δεδομένα για pie chart (συνολική κατανάλωση ανά διαμέρισμα)
    const totalConsumption = Object.entries(apartmentConsumption).map(([apartmentName, periodData]) => {
      const total = Object.values(periodData).reduce((sum, consumption) => sum + consumption, 0);
      return {
        name: apartmentName,
        value: total,
      };
    });

    // Δεδομένα για trend line chart
    const trendChartData = sortedPeriods.map(periodKey => {
      const dataPoint: any = { period: periodKey };
      Object.entries(apartmentConsumption).forEach(([apartmentName, periodData]) => {
        dataPoint[apartmentName] = periodData[periodKey] || 0;
      });
      return dataPoint;
    });

    setConsumptionData(barChartData);
    setPieData(totalConsumption);
    setTrendData(trendChartData);
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

  const calculateTotalConsumption = (): number => {
    return meterReadings?.reduce((total, reading) => total + (typeof reading.consumption === 'string' ? parseFloat(reading.consumption) || 0 : reading.consumption || 0), 0) || 0;
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={consumptionData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="period" 
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
          labelFormatter={(label) => `Περίοδος: ${label}`}
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

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: any, name: string) => [value, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={trendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="period" 
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
          labelFormatter={(label) => `Περίοδος: ${label}`}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Φόρτωση δεδομένων κατανάλωσης...</span>
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

  if (!consumptionData || consumptionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-center">
          <p>Δεν υπάρχουν δεδομένα κατανάλωσης</p>
          <p className="text-sm">Προσθέστε μετρήσεις για να δείτε τα γραφήματα</p>
        </div>
      </div>
    );
  }

  const totalConsumption = calculateTotalConsumption();
  const apartmentCount = getApartmentNames().length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Ανάλυση Κατανάλωσης
        </h3>
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
          <span>Τύπος: {chartType === 'bar' ? 'Ράβδων' : chartType === 'pie' ? 'Πίτας' : 'Γραμμικό'}</span>
          <span>•</span>
          <span>Περίοδος: {period === 'month' ? 'Μηνιαία' : period === 'quarter' ? 'Τριμηνιαία' : 'Ετήσια'}</span>
          <span>•</span>
          <span>Συνολική κατανάλωση: {totalConsumption.toFixed(2)}</span>
        </div>
      </div>

      <div className="chart-container">
        {chartType === 'bar' && renderBarChart()}
        {chartType === 'pie' && renderPieChart()}
        {chartType === 'line' && renderLineChart()}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <p className="font-medium text-gray-700">Στατιστικά</p>
          <p>Διαμερίσματα: {apartmentCount}</p>
          <p>Συνολική κατανάλωση: {totalConsumption.toFixed(2)}</p>
          <p>Μέση κατανάλωση: {(totalConsumption / apartmentCount).toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="font-medium text-gray-700">Περίοδοι</p>
          <p>Συνολικές περίοδοι: {consumptionData.length}</p>
          <p>Πρώτη περίοδος: {consumptionData[0]?.period}</p>
          <p>Τελευταία περίοδος: {consumptionData[consumptionData.length - 1]?.period}</p>
        </div>
      </div>
    </div>
  );
}; 