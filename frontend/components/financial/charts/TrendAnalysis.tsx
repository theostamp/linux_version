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
  Area,
  AreaChart,
} from 'recharts';
import { useMeterReadings } from '../../hooks/useMeterReadings';

interface TrendAnalysisProps {
  apartmentId?: number;
  predictionMonths?: number;
  height?: number;
  showPrediction?: boolean;
}

const COLORS = {
  actual: '#8884d8',
  predicted: '#82ca9d',
  trend: '#ffc658',
  confidence: '#ff7300',
};

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  apartmentId,
  predictionMonths = 3,
  height = 400,
  showPrediction = true,
}) => {
  const { meterReadings, loading, error } = useMeterReadings();
  const [trendData, setTrendData] = useState<any[]>([]);
  const [predictionData, setPredictionData] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({});

  useEffect(() => {
    if (meterReadings && meterReadings.length > 0) {
      analyzeTrends();
    }
  }, [meterReadings, apartmentId, predictionMonths]);

  const analyzeTrends = () => {
    if (!meterReadings) return;

    // Φιλτράρισμα ανά διαμέρισμα αν δοθεί apartmentId
    let filteredReadings = meterReadings;
    if (apartmentId) {
      filteredReadings = meterReadings.filter(
        (reading) => reading.apartment === apartmentId
      );
    }

    // Ομαδοποίηση ανά μήνα και διαμέρισμα
    const monthlyData = filteredReadings.reduce((acc, reading) => {
      const date = new Date(reading.reading_date);
      const monthKey = date.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' });
      const apartmentName = reading.apartment_name;
      const consumption = reading.consumption || 0;

      if (!acc[monthKey]) {
        acc[monthKey] = {};
      }

      if (!acc[monthKey][apartmentName]) {
        acc[monthKey][apartmentName] = {
          consumption: 0,
          readings: 0,
        };
      }

      acc[monthKey][apartmentName].consumption += consumption;
      acc[monthKey][apartmentName].readings += 1;
      return acc;
    }, {} as Record<string, Record<string, { consumption: number; readings: number }>>);

    // Μετατροπή σε array και ταξινόμηση
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    // Δημιουργία trend data
    const trendChartData = sortedMonths.map(monthKey => {
      const dataPoint: any = { month: monthKey };
      Object.entries(monthlyData[monthKey]).forEach(([apartmentName, data]) => {
        dataPoint[apartmentName] = data.consumption;
      });
      return dataPoint;
    });

    // Υπολογισμός στατιστικών
    const stats = calculateStatistics(trendChartData);
    setStatistics(stats);

    // Δημιουργία prediction data
    if (showPrediction && trendChartData.length >= 2) {
      const predictions = generatePredictions(trendChartData, predictionMonths);
      setPredictionData(predictions);
    }

    setTrendData(trendChartData);
  };

  const calculateStatistics = (data: any[]) => {
    const allConsumptions = data.flatMap(monthData => 
      Object.entries(monthData)
        .filter(([key]) => key !== 'month')
        .map(([, value]) => value as number)
    );

    const total = allConsumptions.reduce((sum, val) => sum + val, 0);
    const average = total / allConsumptions.length;
    const variance = allConsumptions.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / allConsumptions.length;
    const stdDev = Math.sqrt(variance);

    // Υπολογισμός τάσης (trend)
    const trend = calculateTrend(data);

    return {
      total,
      average: average.toFixed(2),
      stdDev: stdDev.toFixed(2),
      min: Math.min(...allConsumptions),
      max: Math.max(...allConsumptions),
      trend,
      dataPoints: allConsumptions.length,
    };
  };

  const calculateTrend = (data: any[]) => {
    if (data.length < 2) return 'stable';

    const firstMonth = data[0];
    const lastMonth = data[data.length - 1];
    
    const firstTotal = Object.entries(firstMonth)
      .filter(([key]) => key !== 'month')
      .reduce((sum, [, value]) => sum + (value as number), 0);
    
    const lastTotal = Object.entries(lastMonth)
      .filter(([key]) => key !== 'month')
      .reduce((sum, [, value]) => sum + (value as number), 0);

    const change = ((lastTotal - firstTotal) / firstTotal) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  };

  const generatePredictions = (data: any[], months: number) => {
    if (data.length < 2) return [];

    const predictions = [];
    const lastMonth = data[data.length - 1];
    const secondLastMonth = data[data.length - 2];

    // Υπολογισμός μέσης αλλαγής ανά μήνα
    const apartments = Object.keys(lastMonth).filter(key => key !== 'month');
    const monthlyChanges = apartments.map(apartment => {
      const current = lastMonth[apartment] || 0;
      const previous = secondLastMonth[apartment] || 0;
      return previous > 0 ? (current - previous) / previous : 0;
    });

    const avgChange = monthlyChanges.reduce((sum, change) => sum + change, 0) / monthlyChanges.length;

    // Δημιουργία προβλέψεων
    for (let i = 1; i <= months; i++) {
      const predictionMonth = new Date();
      predictionMonth.setMonth(predictionMonth.getMonth() + i);
      const monthKey = predictionMonth.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' });

      const predictionPoint: any = { 
        month: monthKey, 
        isPrediction: true,
        confidence: Math.max(0.5, 1 - (i * 0.1)) // Μειούμενο confidence για μελλοντικές προβλέψεις
      };

      apartments.forEach(apartment => {
        const currentValue = lastMonth[apartment] || 0;
        const predictedValue = currentValue * (1 + avgChange * i);
        predictionPoint[apartment] = Math.max(0, predictedValue);
      });

      predictions.push(predictionPoint);
    }

    return predictions;
  };

  const getApartmentNames = (): string[] => {
    if (!meterReadings) return [];
    const names = new Set(meterReadings.map(reading => reading.apartment_name));
    return Array.from(names);
  };

  const renderTrendChart = () => {
    const combinedData = [...trendData, ...predictionData];
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
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
            labelFormatter={(label) => `Μήνας: ${label}`}
          />
          <Legend />
          {getApartmentNames().map((apartmentName, index) => (
            <Area
              key={apartmentName}
              type="monotone"
              dataKey={apartmentName}
              stroke={COLORS.actual}
              fill={COLORS.actual}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '↗️';
      case 'decreasing':
        return '↘️';
      default:
        return '→';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-red-600';
      case 'decreasing':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Ανάλυση τάσεων...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">
          <p>Σφάλμα κατά την ανάλυση:</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!trendData || trendData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-center">
          <p>Δεν υπάρχουν αρκετά δεδομένα για ανάλυση τάσεων</p>
          <p className="text-sm">Απαιτούνται τουλάχιστον 2 μήνες δεδομένων</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Ανάλυση Τάσεων & Προβλέψεις
        </h3>
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
          <span>Διαμέρισμα: {apartmentId ? `#${apartmentId}` : 'Όλα'}</span>
          <span>•</span>
          <span>Προβλέψεις: {showPrediction ? `${predictionMonths} μήνες` : 'Απενεργοποιημένες'}</span>
          <span>•</span>
          <span>Τάση: <span className={getTrendColor(statistics.trend)}>{getTrendIcon(statistics.trend)} {statistics.trend}</span></span>
        </div>
      </div>

      <div className="chart-container">
        {renderTrendChart()}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <p className="font-medium text-gray-700">Στατιστικά Τάσεων</p>
          <p>Μέση κατανάλωση: {statistics.average}</p>
          <p>Τυπική απόκλιση: {statistics.stdDev}</p>
          <p>Ελάχιστη: {statistics.min}</p>
          <p>Μέγιστη: {statistics.max}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="font-medium text-gray-700">Προβλέψεις</p>
          <p>Δεδομένα σημεία: {statistics.dataPoints}</p>
          <p>Μήνες προβλέψεων: {predictionData.length}</p>
          <p>Εμπιστοσύνη: {predictionData.length > 0 ? `${(predictionData[0]?.confidence * 100).toFixed(0)}%` : 'N/A'}</p>
          <p>Τάση: <span className={getTrendColor(statistics.trend)}>{statistics.trend}</span></p>
        </div>
      </div>

      {predictionData.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            <strong>Προβλέψεις:</strong> Οι προβλέψεις βασίζονται σε ιστορικά δεδομένα και μπορεί να διαφέρουν από την πραγματικότητα. 
            Η ακρίβεια μειώνεται για μελλοντικούς μήνες.
          </p>
        </div>
      )}
    </div>
  );
}; 